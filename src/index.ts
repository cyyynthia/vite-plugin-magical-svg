/*
 * Copyright (c) 2021-2022 Cynthia K. Rey, All rights reserved.
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

import type { Plugin } from 'vite'
import type { PluginContext, OutputOptions } from 'rollup'
import type { OptimizeOptions } from 'svgo'
import { URL } from 'url'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { basename, extname, relative } from 'path'
import { Builder, parseStringPromise as parseXml } from 'xml2js'
import { optimize as svgoOptimize } from 'svgo'
import MagicString from 'magic-string'

import resolve from './resolve.js'
import Generators from './codegen.js'

type SymbolIdGenerator = (file: string, raw: string) => string | null | void
export type MagicalSvgConfig = {
  target?: keyof typeof Generators,
  symbolId?: SymbolIdGenerator,
  svgo?: boolean
}

type SvgAsset = { sources: string[], xml: any }
type AssetName = NonNullable<OutputOptions['assetFileNames']>

const ASSET_RE = /__MAGICAL_SVG_SPRITE__([0-9a-f]{8})__/g

async function transformRefs (xml: any, fn: (ref: string, isFile: boolean) => Promise<string | null>) {
  if (typeof xml !== 'object') return

  for (const tag in xml) {
    if (tag in xml && tag !== '$') {
      for (const element of xml[tag]) {
        if ((tag === 'image' || tag === 'use') && element.$?.href) {
          const ref = await fn(element.$.href, tag === 'image')
          if (ref) element.$.href = ref
        }

        await transformRefs(element, fn)
      }
    }
  }
}

async function load (ctx: PluginContext, file: string, symbolIdGen?: SymbolIdGenerator): Promise<[ string, any, string[] ]> {
  const imports: string[] = []
  const raw = await readFile(file, 'utf8')
  const xml = await parseXml(raw)
  if (!('svg' in xml)) throw new Error('invalid svg: top level xml element isn\'t an svg')

  await transformRefs(xml.svg, async (ref, isFile) => {
    const resolved = await ctx.resolve(ref, file)
    if (!resolved?.id) return null

    const url = new URL(resolved.id, 'file:///')
    if (isFile) url.searchParams.set('file', 'true')
    const importUrl = url.toString().slice(7)

    if (!imports.includes(importUrl)) imports.push(importUrl)
    return importUrl
  })

  if (typeof xml.svg !== 'object') xml.svg = { _: xml.svg }
  xml.svg.$ = xml.svg.$ ?? {}
  xml.svg.$.id = symbolIdGen?.(file, raw) || createHash('sha256').update(raw).digest('hex').slice(0, 8);
  delete xml.svg.$.width
  delete xml.svg.$.height

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
      .replace(/\[name\]/g, name)
      .replace(/\[extname\]/g, ext)
      .replace(/\[ext\]/g, ext.slice(1))
      .replace(/\[hash\]/g, hash)
  }

  return template({
    type: 'asset',
    source: raw,
    name: file
  })
}

export default function (config: MagicalSvgConfig = {}): Plugin {
  let fileName: AssetName = 'assets/[name].[hash].[ext]'
  let sourcemap = false
  let serve = false

  const assets = new Map<string, SvgAsset>()

  const viewBoxes = new Map<string, string>()
  const symbolIds = new Map<string, string>()

  const files = new Map<string, string>()
  const sprites = new Map<string, string>()

  return {
    name: 'vite-plugin-magical-svg',
    enforce: 'pre',
    configResolved (cfg) {
      sourcemap = Boolean(cfg.build.sourcemap)
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
    },
    resolveId (id, importer) {
      if (!importer || !id.endsWith('.svg') || id.startsWith('.') || id.startsWith('/')) return

      // I'm implementing my own naive resolve as I need to *avoid* `exports` compliance
      // which is something Vite's resolver won't let me do it seems :<
      return resolve(id, importer)
    },
    async load (id) {
      const url = new URL(id, 'file:///')
      if (!url.pathname.endsWith('.svg')) return null

      const [ raw, xml, imports ] = await load(this, url.pathname, config.symbolId)
      viewBoxes.set(id, xml.svg.$.viewBox)
      if (url.searchParams.has('file') || serve) {
        assets.set(id, { sources: [], xml: xml })
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

        if (!assets.has(spriteId)) assets.set(spriteId, sprite)
        sprite.xml.svg.symbol.push(xml.svg)
        sprite.sources.push(raw)
        symbolIds.set(id, xml.svg.$.id)
      }

      const imp = imports.map((i) => `import ${JSON.stringify(i)};`).join('\n')
      const file = generateFilename(fileName, url.pathname, raw)
      return `${imp}\nexport default ${JSON.stringify(`/${file}`)}`
    },
    async transform (code, id) {
      const url = new URL(id, 'file:///')
      if (!url.pathname.endsWith('.svg')) return null
      const assetId = url.searchParams.has('file') ? id : url.searchParams.get('sprite') ?? 'sprite'

      const exportIndex = code.indexOf('export default')
      if (url.searchParams.has('file')) {
        const file = code.slice(exportIndex + 16, -1)
        files.set(assetId, file.slice(1))
        return null
      }

      const generator = Generators[config.target ?? 'dom']
      const preamble = code.slice(0, exportIndex)
      if (serve) {
        const asset = assets.get(id)!
        return [ preamble, generator.dev(asset.xml) ].join('\n')
      }

      const symbolId = symbolIds.get(id)!
      if (assetId === 'inline') {
        return [ preamble, generator.prod(viewBoxes.get(id)!, `'#${symbolId}'`) ].join('\n')
      }

      sprites.set(symbolId, assetId)
      return [ preamble, generator.prod(viewBoxes.get(id)!, `__MAGICAL_SVG_SPRITE__${symbolId}__`) ].join('\n')
    },
    renderChunk (code) {
      let match
      let magicString
      while ((match = ASSET_RE.exec(code))) {
        magicString = magicString || (magicString = new MagicString(code))
        const assetId = sprites.get(match[1])!
        const asset = assets.get(assetId)!
        if (!files.has(assetId)) {
          files.set(assetId, generateFilename(fileName, `${assetId}.svg`, asset.sources.sort().join('')))
        }

        magicString.overwrite(
          match.index,
          match.index + match[0].length,
          JSON.stringify(`/${files.get(assetId)}#${match[1]}`)
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
        if (assetId === 'inline') return

        const asset = assets.get(assetId)!
        await transformRefs(asset.xml.svg, async (ref, isFile) => {
          if (!isFile) {
            const url = new URL(ref, 'file:///')
            const file = files.get(url.searchParams.get('sprite') || 'sprite')
            if (!file) return null

            return `/${file}#${symbolIds.get(ref)}`
          }

          const file = files.get(ref)
          return file ? `/${file}` : null
        })

        const builder = new Builder()
        let xml = builder.buildObject(asset.xml)
        if (config.svgo !== false) {
          const opts: OptimizeOptions = {
            plugins: [
              {
                name: 'preset-default',
                params: {
                  overrides: {
                    cleanupNumericValues: false,
                    removeUselessDefs: files.has(assetId) ? false : void 0,
                    cleanupIDs: {
                      minify: false,
                      remove: false,
                    },
                    convertPathData: false
                  },
                },
              },
            ],
          }

          xml = svgoOptimize(xml, opts).data
        }

        this.emitFile({
          type: 'asset',
          fileName: files.get(assetId),
          source: xml
        })
      }
    }
  }
}
