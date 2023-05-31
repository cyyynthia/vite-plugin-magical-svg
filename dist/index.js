"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const xml2js_1 = require("xml2js");
const svgo_1 = require("svgo");
const magic_string_1 = __importDefault(require("magic-string"));
const resolve_js_1 = __importDefault(require("./resolve.js"));
const codegen_js_1 = __importStar(require("./codegen.js"));
const ASSET_RE = /__MAGICAL_SVG_SPRITE__([0-9a-f]{8})__/g;
function traverseSvg(xml, handler) {
    if (typeof xml !== 'object')
        return Promise.resolve();
    const promises = [];
    for (const tag in xml) {
        if (tag in xml && tag !== '$') {
            for (const element of xml[tag]) {
                promises.push(handler(tag, element), traverseSvg(element, handler));
            }
        }
    }
    return Promise.all(promises);
}
function transformRefs(xml, fn) {
    return traverseSvg(xml, async (tag, element) => {
        if ((tag === 'image' || tag === 'use') && element.$?.href) {
            const ref = await fn(element.$.href, tag === 'image');
            if (ref)
                element.$.href = ref;
        }
    });
}
function hashSymbols(xml) {
    return traverseSvg(xml, (tag, element) => {
        if (tag === 'use' && element.$?.href) {
            element.$.href = `#${(0, crypto_1.createHash)('sha256').update(element.$.href).digest('hex').slice(0, 8)}`;
        }
    });
}
async function load(ctx, file, serve, symbolIdGen) {
    const imports = [];
    const raw = await (0, promises_1.readFile)(file, 'utf8');
    const xml = await (0, xml2js_1.parseStringPromise)(raw);
    if (!('svg' in xml))
        throw new Error('invalid svg: top level xml element isn\'t an svg');
    await transformRefs(xml.svg, async (ref, isFile) => {
        const resolved = await ctx.resolve(ref, file);
        if (!resolved?.id)
            return null;
        const url = new url_1.URL(resolved.id, 'file:///');
        if (isFile)
            url.searchParams.set('file', 'true');
        else if (serve)
            url.searchParams.set('sprite', 'inline');
        const importUrl = url.toString().slice(7);
        if (!imports.includes(importUrl))
            imports.push(importUrl);
        return importUrl;
    });
    if (typeof xml.svg !== 'object')
        xml.svg = { _: xml.svg };
    xml.svg.$ = xml.svg.$ ?? {};
    xml.svg.$.id = symbolIdGen?.(file, raw) || (0, crypto_1.createHash)('sha256').update(raw).digest('hex').slice(0, 8);
    delete xml.svg.$.width;
    delete xml.svg.$.height;
    return [raw, xml, imports];
}
function generateFilename(template, file, raw) {
    if (typeof template === 'string') {
        const ext = (0, path_1.extname)(file);
        const name = (0, path_1.basename)(file, ext);
        const hash = template.includes('[hash]') // only compute hash when needed
            ? (0, crypto_1.createHash)('sha256').update(raw).digest('hex').slice(0, 8)
            : '';
        return template
            .replace(/\[name\]/g, name)
            .replace(/\[extname\]/g, ext)
            .replace(/\[ext\]/g, ext.slice(1))
            .replace(/\[hash\]/g, hash);
    }
    return template({
        type: 'asset',
        source: raw,
        name: file
    });
}
function default_1(config = {}) {
    let fileName = 'assets/[name].[hash].[ext]';
    let sourcemap = false;
    let serve = false;
    const assets = new Map();
    const viewBoxes = new Map();
    const symbolIds = new Map();
    const files = new Map();
    const sprites = new Map();
    return {
        name: 'vite-plugin-magical-svg',
        enforce: 'pre',
        configResolved(cfg) {
            sourcemap = Boolean(cfg.build.sourcemap);
            const { output } = cfg.build.rollupOptions;
            if (cfg.command === 'serve') {
                serve = true;
                fileName = (info) => (0, path_1.relative)(cfg.root, info.name);
            }
            else if (output && !Array.isArray(output) && output.assetFileNames) {
                fileName = output.assetFileNames;
            }
        },
        async transformIndexHtml(html) {
            if (assets.has('inline')) {
                const inline = assets.get('inline');
                const bodyTagStart = html.indexOf('<body');
                const bodyStart = html.indexOf('>', bodyTagStart) + 1;
                const head = html.slice(0, bodyStart);
                const body = html.slice(bodyStart);
                const svg = new xml2js_1.Builder({ headless: true }).buildObject(inline.xml);
                return head + svg + body;
            }
        },
        resolveId(id, importer) {
            if (!importer || !id.endsWith('.svg') || id.startsWith('.') || id.startsWith('/'))
                return;
            // I'm implementing my own naive resolve as I need to *avoid* `exports` compliance
            // which is something Vite's resolver won't let me do it seems :<
            return (0, resolve_js_1.default)(id, importer);
        },
        async load(id) {
            const url = new url_1.URL(id, 'file:///');
            if (!url.pathname.endsWith('.svg'))
                return null;
            const [raw, xml, imports] = await load(this, url.pathname, serve, config.symbolId);
            viewBoxes.set(id, xml.svg.$.viewBox);
            if (url.searchParams.has('file') || serve) {
                assets.set(id, { sources: [], xml: xml });
            }
            else {
                const spriteId = url.searchParams.get('sprite') ?? 'sprite';
                const sprite = assets.get(spriteId) ?? {
                    sources: [],
                    xml: {
                        svg: {
                            $: { width: 0, height: 0 },
                            symbol: []
                        }
                    }
                };
                if (!assets.has(spriteId))
                    assets.set(spriteId, sprite);
                sprite.xml.svg.symbol.push(xml.svg);
                sprite.sources.push(raw);
                symbolIds.set(id, xml.svg.$.id);
            }
            const imp = imports.map((i) => `import ${JSON.stringify(i)};`).join('\n');
            const file = generateFilename(fileName, url.pathname, raw);
            return `${imp}\nexport default ${JSON.stringify(`/${file}`)}`;
        },
        async transform(code, id) {
            const url = new url_1.URL(id, 'file:///');
            if (!url.pathname.endsWith('.svg'))
                return null;
            const assetId = url.searchParams.has('file') ? id : url.searchParams.get('sprite') ?? 'sprite';
            const exportIndex = code.indexOf('export default');
            if (url.searchParams.has('file')) {
                const file = code.slice(exportIndex + 16, -1);
                files.set(assetId, file.slice(1));
                return {
                    code: code,
                    map: { mappings: '' },
                };
            }
            const generator = codegen_js_1.default[config.target ?? 'dom'];
            const preamble = code.slice(0, exportIndex);
            if (serve) {
                const asset = assets.get(id);
                hashSymbols(asset.xml.svg);
                if (assetId === 'inline') {
                    asset.xml.svg.$.id = (0, crypto_1.createHash)('sha256').update(id).digest('hex').slice(0, 8);
                    return {
                        code: [preamble, generator.prod(asset.xml.svg.$.viewBox, `'#${asset.xml.svg.$.id}'`), (0, codegen_js_1.inlineSymbol)(asset.xml)].join('\n'),
                        map: { mappings: '' },
                    };
                }
                return {
                    code: [preamble, generator.dev(asset.xml)].join('\n'),
                    map: { mappings: '' },
                };
            }
            const symbolId = symbolIds.get(id);
            if (assetId === 'inline') {
                return {
                    code: [preamble, generator.prod(viewBoxes.get(id), `'#${symbolId}'`)].join('\n'),
                    map: { mappings: '' },
                };
            }
            sprites.set(symbolId, assetId);
            const asset = assets.get(assetId);
            files.set(assetId, generateFilename(fileName, `${assetId}.svg`, asset.sources.sort().join('')));
            return {
                code: [preamble, generator.prod(viewBoxes.get(id), `__MAGICAL_SVG_SPRITE__${symbolId}__`)].join('\n'),
                map: { mappings: '' },
            };
        },
        renderChunk(code) {
            let match;
            let magicString;
            while ((match = ASSET_RE.exec(code))) {
                magicString = magicString || (magicString = new magic_string_1.default(code));
                const assetId = sprites.get(match[1]);
                magicString.overwrite(match.index, match.index + match[0].length, JSON.stringify(`/${files.get(assetId)}#${match[1]}`));
            }
            if (!magicString)
                return null;
            return {
                code: magicString.toString(),
                map: sourcemap ? magicString.generateMap({ hires: true }) : null
            };
        },
        async generateBundle() {
            for (const assetId of assets.keys()) {
                if (assetId === 'inline')
                    continue;
                const asset = assets.get(assetId);
                await transformRefs(asset.xml.svg, async (ref, isFile) => {
                    if (!isFile) {
                        const url = new url_1.URL(ref, 'file:///');
                        const file = files.get(url.searchParams.get('sprite') || 'sprite');
                        if (!file)
                            return null;
                        return `/${file}#${symbolIds.get(ref)}`;
                    }
                    const file = files.get(ref);
                    return file ? `/${file}` : null;
                });
                const builder = new xml2js_1.Builder();
                let xml = builder.buildObject(asset.xml);
                if (config.svgo !== false) {
                    const opts = {
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
                    };
                    const res = (0, svgo_1.optimize)(xml, opts);
                    if (res.modernError) {
                        this.error(res.modernError.message, { column: res.modernError.column, line: res.modernError.line });
                    }
                    xml = res.data;
                }
                this.emitFile({
                    type: 'asset',
                    fileName: files.get(assetId),
                    source: xml
                });
            }
        }
    };
}
exports.default = default_1;
