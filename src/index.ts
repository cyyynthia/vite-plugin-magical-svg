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
import type { PluginContext, OutputOptions } from 'rollup'
import type { Config } from 'svgo'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFilter } from 'vite'
import { Builder, parseStringPromise as parseXml } from 'xml2js'
import { optimize as svgoOptimize } from 'svgo'
import MagicString from 'magic-string'

import resolve from './resolve.js'
import type { SupportedTarget } from './codegen.js'
import {
	generateId,
	transformRefs,
	hashSymbols,
	transformSvg,
	generateModuleCode,
	type SymbolIdGenerator
} from './transform.js'

type SvgAsset = { sources: string[]; xml: any }
type AssetName = NonNullable<OutputOptions['assetFileNames']>

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
	let xml
	try {
		xml = await parseXml(raw)
	} catch (e) {
		const msg = e instanceof Error ? e.message : e?.toString()
		ctx.error(`Could not load SVG: invalid XML (${msg}) (in ${fileFriendlyName})`)
	}

	if (!xml) {
		ctx.error(`Could not load SVG: empty file (in ${fileFriendlyName})`)
	}

	if (!('svg' in xml)) {
		ctx.error(`Could not load SVG: Top-level XML element isn't \`svg\` (in ${fileFriendlyName})`)
	}

	if (!xml.svg) {
		ctx.warn(`${fileFriendlyName} is an empty SVG.`)
	}

	await transformRefs (xml.svg, async (ref, isFile) => {
		const resolved = await ctx.resolve(ref, file)
		if (!resolved?.id) return null

		const url = new URL(`file:///${resolved.id}`)
		if (isFile) url.searchParams.set('file', 'true')
		else if (serve) url.searchParams.set('sprite', 'inline')

		const importUrl = url.toString().slice(7)
		if (!imports.includes(importUrl)) imports.push(importUrl)
		return importUrl
	})

	if (typeof xml.svg !== 'object') xml.svg = { _: xml.svg }
	xml.svg.$ = xml.svg.$ ?? {}
	xml.svg.$.id = symbolIdGen?.(file, raw) || generateId(raw);

	return [ raw, xml, imports ]
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
			.replace(/\[hash]/g, hash);
	}

	return template({
		type: 'asset',
		source: raw,
		name: file,
		names: [file],
		originalFileName: null,
		originalFileNames: []
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
		configResolved (cfg) {
			ROOT = cfg.root ?? ROOT
			base = cfg.base ?? base
			sourcemap = !!cfg.build.sourcemap
			treeshake = cfg.build.rollupOptions.treeshake !== false

			const { output } = cfg.build.rollupOptions

			if (cfg.command === 'serve') {
				serve = true
				fileName = (info) => relative(cfg.root, info.name!)
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
				const svg = new Builder({ headless: true }).buildObject(inline.xml)
				return head + svg + body
			}

			return
		},
		resolveId (id, importer) {
			if (!importer || !id.endsWith('.svg') || id.startsWith('.') || id.startsWith('/')) return
			if (!filter(id)) return

			// I'm implementing my own naive resolve as I need to *avoid* `exports` compliance
			// which is something Vite's resolver won't let me do it seems :<
			return resolve(id, importer)
		},
		async load (id) {
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
							$: { width: 0, height: 0 },
							symbol: []
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

				sprite.xml.svg.symbol.push(xml.svg)
				sprite.sources.push(raw)
				symbolIds.set(id, xml.svg.$.id)
			}

			const imp = imports.map((i) => `import ${JSON.stringify(i)};`).join('\n')
			const file = generateFilename(fileName, filePath, raw)
			return {
				code: `${imp}\nexport default ${JSON.stringify(`/${file}`)}`,
				moduleSideEffects: false,
			}
		},
		async transform (code, id) {
			const url = new URL(`file:///${id}`)
			if (!filter(id) || !url.pathname.endsWith('.svg')) return null
			const assetId = url.searchParams.has('file') ? id : url.searchParams.get('sprite') ?? 'sprite'

			const exportIndex = code.indexOf('export default')
			if (url.searchParams.has('file')) {
				const file = code.slice(exportIndex + 16, -1)
				files.set(assetId, file.slice(1))
				return {
					code: generateModuleCode({ type: 'file' }, config.target ?? 'dom', code, {
						viewBox: '',
						width: '',
						height: ''
					}),
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
						code: generateModuleCode({ type: 'dev-inline', xml: asset.xml }, target, preamble, viewBoxes.get(id)!),
						map: { mappings: '' }
					}
				}

				return {
					code: generateModuleCode({ type: 'dev', xml: asset.xml }, target, preamble, viewBoxes.get(id)!),
					map: { mappings: '' }
				}
			}

			const symbolId = symbolIds.get(id)!
			if (assetId === 'inline') {
				return {
					code: generateModuleCode({ type: 'prod-inline', symbolId }, target, preamble, viewBoxes.get(id)!),
					map: { mappings: '' }
				}
			}

			sprites.set(symbolId, assetId)
			const asset = assets.get(assetId)!
			files.set(assetId, generateFilename(fileName, `${assetId}.svg`, asset.sources.sort().join('')))

			return {
				code: generateModuleCode({ type: 'prod-sprite', symbolId }, target, preamble, viewBoxes.get(id)!),
				map: { mappings: '' }
			}
		},
		renderChunk (code) {
			let match
			let magicString
			while ((match = ASSET_RE.exec(code))) {
				magicString = magicString || (magicString = new MagicString(code))

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
				code: magicString.toString(),
				map: sourcemap ? magicString.generateMap({ hires: true }) : null
			}
		},
		async generateBundle () {
			for (const assetId of assets.keys()) {
				if (assetId === 'inline') continue

				const asset = assets.get(assetId)!

				// Treeshake symbols
				if (treeshake) {
					if (asset.xml.svg.symbol) {
						const used = usedAssets.get(assetId)!
						asset.xml.svg.symbol = asset.xml.svg.symbol.filter((s: any) => used.has(s.$.id))
					} else {
						// This is a file. We can know if the file has been tree-shaken by checking `isIncluded`.
						const mdl = this.getModuleInfo(assetId)
						if (!mdl?.isIncluded) continue // Skip the file
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

				const builder = new Builder()
				let xml = builder.buildObject(asset.xml)
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
							this.error(`${message} (at line ${line}, column ${column})`)
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
