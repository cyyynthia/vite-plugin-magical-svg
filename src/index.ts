/*!
 * Copyright (c) Cynthia Rey et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type { Plugin, FilterPattern } from 'vite'
import type { PluginContext as RollupPluginContext, OutputOptions as RollupOutputOptions } from 'rollup'
import type { PluginContext as RolldownPluginContext, OutputOptions as RolldownOutputOptions, RolldownMagicString } from 'rolldown'
import type { Config } from 'svgo'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFilter } from 'vite'
import { optimize as svgoOptimize } from 'svgo'
import MagicString from 'magic-string'

import resolve from './resolve.js'
import { stringify as stringifyXml } from './xml.ts'
import type { SupportedTarget } from './codegen.js'
import {
	transformRefs,
	hashSymbols,
	transformSvg,
	generateFileCode,
	generateDevCode,
	generateDevInlineCode,
	generateProdInlineCode,
	generateProdSpriteCode,
	type SymbolIdGenerator,
	parseSvg,
} from './transform.js'

type PluginContext = RollupPluginContext | RolldownPluginContext
type MagicStringInstance = (MagicString & { isRolldownMagicString?: undefined }) | RolldownMagicString | undefined

type SvgAsset = { sources: string[]; xml: any }
type AssetName = NonNullable<RollupOutputOptions['assetFileNames'] | RolldownOutputOptions['assetFileNames']>
type PreRenderedAsset = Parameters<Exclude<AssetName, string>>[0]

export type MagicalSvgConfig = {
	include?: FilterPattern | undefined
	exclude?: FilterPattern | undefined
	target?: SupportedTarget
	symbolId?: SymbolIdGenerator
	svgo?: boolean

	preserveWidthHeight?: boolean
	setWidthHeight?: { width: string; height: string }
	setFillStrokeColor?: boolean | string
	restoreMissingViewBox?: boolean
}

let ROOT = '/'
const ASSET_RE = /__MAGICAL_SVG_SPRITE__(_[0-9a-f]{8})__/g

async function load (
	ctx: PluginContext,
	file: string,
	serve: boolean,
	symbolIdGen?: SymbolIdGenerator
): Promise<[string, any, string[]]> {
	const fileFriendlyName = relative(ROOT, file)

	const imports: string[] = []
	const raw = await readFile(file, 'utf8')
	let parsed
	try {
		parsed = await parseSvg(raw, file, symbolIdGen)
	} catch (e) {
		const msg = e instanceof Error ? e.message : e?.toString()
		ctx.error(`Could not load SVG: ${msg} (in ${fileFriendlyName})`)
		throw 0 // Unreachable, seems like TS7 has a regression with functions that never return?
	}

	if (parsed.empty) {
		ctx.warn(`${fileFriendlyName} is an empty SVG.`)
	}

	await transformRefs(parsed.xml.svg, async (ref, isFile) => {
		const resolved = await ctx.resolve(ref, file)
		if (!resolved?.id) return null

		const url = new URL(`file:///${resolved.id}`)
		if (isFile) url.searchParams.set('file', 'true')
		else if (serve) url.searchParams.set('sprite', 'inline')

		const importUrl = url.toString().slice(7)
		if (!imports.includes(importUrl)) imports.push(importUrl)
		return importUrl
	})

	return [ raw, parsed.xml, imports ]
}

function generateFilename (template: AssetName, file: string, raw: string) {
	if (typeof template === 'string') {
		const ext = extname(file)
		const name = basename(file, ext)
		const hash = template.includes('[hash]') // only compute hash when needed
			? createHash('sha256').update(raw).digest('hex').slice(0, 8)
			: ''

		return template
			.replace(/\[name]/g, name)
			.replace(/\[extname]/g, ext)
			.replace(/\[ext]/g, ext.slice(1))
			.replace(/\[hash]/g, hash)
	}

	return template({
		type: 'asset',
		source: raw,
		name: file,
		names: [file],
		originalFileName: null!, // Rolldown is a fine piece of software (no)
		originalFileNames: [],
	})
}

export function magicalSvgPlugin (config: MagicalSvgConfig = {}): Plugin {
	let fileName: AssetName = 'assets/[name].[hash].[ext]'
	let base = '/'
	let treeshake = true
	let sourcemap = false
	let serve = false

	const filter = createFilter(config.include, config.exclude)

	const assets = new Map<string, SvgAsset>()

	type ViewBoxInfo = { viewBox: string, width: string, height: string }
	const viewBoxes = new Map<string, ViewBoxInfo>()
	const symbolIds = new Map<string, string>()

	const files = new Map<string, string>()
	const sprites = new Map<string, string>()

	const usedAssets = new Map<string, Set<string>>()

	return {
		name: 'vite-plugin-magical-svg',
		enforce: 'pre',
		configResolved(cfg) {
			const bundlerOptions = this.meta.rolldownVersion
				? cfg.build.rolldownOptions
				: cfg.build.rollupOptions

			ROOT = cfg.root ?? ROOT
			base = cfg.base ?? base
			sourcemap = !!cfg.build.sourcemap
			treeshake = bundlerOptions.treeshake !== false

			const { output } = bundlerOptions

			if (cfg.command === 'serve') {
				serve = true
				fileName = (info: PreRenderedAsset) => relative(cfg.root, info.names[0]!)
			} else if (output && !Array.isArray(output) && output.assetFileNames) {
				fileName = output.assetFileNames
			}
		},
		async transformIndexHtml (html) {
			if (assets.has('inline')) {
				const inline = assets.get('inline')!
				const bodyTagStart = html.indexOf('<body')
				const bodyStart = html.indexOf('>', bodyTagStart) + 1

				const head = html.slice(0, bodyStart)
				const body = html.slice(bodyStart)
				const svg = stringifyXml(inline.xml)
				return head + svg + body
			}

			return
		},
		resolveId: {
			filter: {
				id: /^[^./].*\.svg$/
			},
			handler(id, importer) {
				if (!importer || !id.endsWith('.svg') || id.startsWith('.') || id.startsWith('/')) return
				if (!filter(id)) return

				// I'm implementing my own naive resolve as I need to *avoid* `exports` compliance
				// which is something Vite's resolver won't let me do it seems :<
				return resolve(id, importer)
			}
		},
		load: {
			filter: {
				id: /\.svg(?:\?.*)?$/
			},
			async handler (id) {
				const url = new URL(`file:///${id}`)
				if (!filter(id) || !url.pathname.endsWith('.svg')) return null

				const filePath = fileURLToPath(url)
				const [ raw, xml, imports ] = await load(this, filePath, serve, config.symbolId)

				const viewboxInfo = await transformSvg(xml, {
					restoreMissingViewBox: config.restoreMissingViewBox,
					setFillStrokeColor: config.setFillStrokeColor,
					preserveWidthHeight: config.preserveWidthHeight,
					setWidthHeight: config.setWidthHeight,
					skipRecolor: url.searchParams.has('skip-recolor')
				})

				viewBoxes.set(id, viewboxInfo)

				if (url.searchParams.has('file') || serve) {
					assets.set(id, { sources: [], xml: xml })
					usedAssets.set(id, new Set())
				} else {
					const spriteId = url.searchParams.get('sprite') ?? 'sprite'
					const sprite = assets.get(spriteId) ?? {
						sources: [],
						xml: {
							svg: {
								'#name': 'svg',
								$: { width: 0, height: 0 },
								$$: []
							}
						}
					}

					if (!assets.has(spriteId)) {
						assets.set(spriteId, sprite)
						usedAssets.set(spriteId, new Set())
					}

					if (spriteId !== 'inline') {
						// Clean (common) useless attributes
						// Don't do this for the inline sprite as this would be a breaking change
						// + it may be useful for JS code :shrug:
						for (const attr of Object.keys(xml.svg.$)) {
							if (attr === 'class' || attr.startsWith('aria-') || attr.startsWith('data-'))
								delete xml.svg.$[attr]
						}
					}

					sprite.xml.svg.$$.push({ '#name': 'symbol', $: xml.svg.$, $$: xml.svg.$$ })
					sprite.sources.push(raw)
					symbolIds.set(id, xml.svg.$.id)
				}

				const imp = imports.map((i) => `import ${JSON.stringify(i)};`).join('\n')
				const file = generateFilename(fileName, filePath, raw)
				return {
					code: `${imp}\nexport default ${JSON.stringify(`/${file}`)}`,
					moduleSideEffects: false,
				}
			}
		},
		transform: {
			filter: {
				id: /\.svg(?:\?.*)?$/
			},
			async handler (code, id) {
				const url = new URL(`file:///${id}`)
				if (!filter(id) || !url.pathname.endsWith('.svg')) return null
				const assetId = url.searchParams.has('file') ? id : url.searchParams.get('sprite') ?? 'sprite'

				const exportIndex = code.indexOf('export default')
				if (url.searchParams.has('file')) {
					const file = code.slice(exportIndex + 16, -1)
					files.set(assetId, file.slice(1))
					return {
						code: generateFileCode(code),
						map: { mappings: '' }
					}
				}

				const target = config.target ?? 'dom'
				const preamble = code.slice(0, exportIndex)
				if (serve) {
					const asset = assets.get(id)!
					await hashSymbols(asset.xml.svg)

					if (assetId === 'inline') {
						return {
							code: generateDevInlineCode(target, preamble, asset.xml),
							map: { mappings: '' }
						}
					}

					return {
						code: generateDevCode(target, preamble, asset.xml),
						map: { mappings: '' }
					}
				}

				const symbolId = symbolIds.get(id)!
				if (assetId === 'inline') {
					return {
						code: generateProdInlineCode(target, preamble, viewBoxes.get(id)!, symbolId),
						map: { mappings: '' }
					}
				}

				sprites.set(symbolId, assetId)
				const asset = assets.get(assetId)!
				files.set(assetId, generateFilename(fileName, `${assetId}.svg`, asset.sources.sort().join('')))

				return {
					code: generateProdSpriteCode(target, preamble, viewBoxes.get(id)!, symbolId),
					map: { mappings: '' }
				}
			}
		},
		renderChunk(code, _, __, meta) {
			let match
			let magicString: MagicStringInstance
			while ((match = ASSET_RE.exec(code))) {
				magicString = magicString || (magicString = meta?.magicString ?? new MagicString(code))

				const spriteId = match[1]!
				const assetId = sprites.get(spriteId)!

				// Mark the symbol as used (for tree-shaking)
				const used = usedAssets.get(assetId)!
				used.add(spriteId)

				magicString.overwrite(
					match.index,
					match.index + match[0].length,
					JSON.stringify(`${base}${files.get(assetId)}#${match[1]}`)
				)
			}

			if (!magicString) return null

			return {
				code: magicString.isRolldownMagicString ? magicString : magicString.toString(),
				map: sourcemap && !magicString.isRolldownMagicString ? magicString.generateMap({ hires: true }) : null
			}
		},
		async generateBundle () {
			for (const assetId of assets.keys()) {
				if (assetId === 'inline') continue

				const asset = assets.get(assetId)!

				// Treeshake symbols
				if (treeshake) {
					if (asset.xml.svg.$$) {
						const used = usedAssets.get(assetId)!
						asset.xml.svg.$$ = asset.xml.svg.$$.filter((s: any) => used.has(s.$.id))
					} else {
						// This is a file. We can know if the file has been tree-shaken by checking `isIncluded`.
						// We need to check if `isIncluded` exists because Rolldown doesn't expose it though...
						const mdl = this.getModuleInfo(assetId)
						if (mdl && 'isIncluded' in mdl && !mdl.isIncluded) continue // Skip the file
					}
				}

				await transformRefs(asset.xml.svg, async (ref, isFile) => {
					if (!isFile) {
						const url = new URL(`file:///${ref}`)
						const file = files.get(url.searchParams.get('sprite') || 'sprite')
						if (!file) return null

						return `${base}${file}#${symbolIds.get(ref)}`
					}

					const file = files.get(ref)
					return file ? `${base}${file}` : null
				})

				let xml = stringifyXml(asset.xml)
				if (config.svgo !== false) {
					const opts: Config = {
						plugins: [
							{
								name: 'preset-default',
								params: {
									overrides: {
										cleanupNumericValues: false,
										removeHiddenElems: false,
										removeUselessDefs: files.has(assetId) ? false : null,
										cleanupIds: {
											minify: false,
											remove: false,
										},
										convertPathData: false
									},
								},
							},
							'removeTitle',
						],
					}

					try {
						const res = svgoOptimize(xml, opts)
						xml = res.data
					} catch (e) {
						if (e instanceof Error && e.name === 'SvgoParserError') {
							// @ts-expect-error -- SvgoParserError is not exported by svgo :pensive:
							const { message, line, column } = e
							this.error({
								message,
								cause: e,
								loc: { line, column }
							})
						} else {
							throw e
						}
					}
				}

				this.emitFile({
					type: 'asset',
					fileName: files.get(assetId)!,
					source: xml
				})
			}
		}
	}
}

export default magicalSvgPlugin
