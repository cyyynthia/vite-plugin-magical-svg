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

import { createHash } from 'node:crypto'
import { parseStringPromise as parseXml } from 'xml2js'
import { generateDev, generateProd, inlineSymbol, type SupportedTarget } from './codegen.js'

export function generateId (str: string) {
	return '_' + createHash('sha256').update(str).digest('hex').slice(0, 8)
}

export function traverseSvg (xml: any, handler: (tag: string, xml: any) => Promise<void> | void): Promise<any> {
	if (typeof xml !== 'object') return Promise.resolve()
	const promises = []

	for (const tag in xml) {
		if (tag in xml && tag !== '$') {
			if (Array.isArray(xml[tag])) {
				for (const element of xml[tag]) {
					promises.push(handler(tag, element), traverseSvg(element, handler))
				}
			} else {
				promises.push(handler(tag, xml[tag]), traverseSvg(xml[tag], handler))
			}
		}
	}

	return Promise.all(promises)
}

export function transformRefs (xml: any, fn: (ref: string, isFile: boolean) => Promise<string | null>) {
	return traverseSvg(xml, async (tag, element) => {
		if ((tag === 'image' || tag === 'use') && element.$?.href) {
			const ref = await fn(element.$.href, tag === 'image')
			if (ref) element.$.href = ref
		}
	})
}

export function hashSymbols (xml: any) {
	return traverseSvg(xml, (tag, element) => {
		if (tag === 'use' && element.$?.href) {
			element.$.href = `#${generateId(element.$.href)}`
		}
	})
}

export function setFillStrokeColor (value: true | string, xml: any) {
	const color = value === true ? 'currentColor' : value
	return traverseSvg(xml, (_, element) => {
		if (!element.$) return

		if ('fill' in element.$ && element.$.fill !== 'none') element.$.fill = color
		if ('stroke' in element.$ && element.$.stroke !== 'none') element.$.stroke = color
	})
}

export type SymbolIdGenerator = (file: string, raw: string) => string | null | void

/**
 * Parse raw SVG content into an xml2js object and assign a symbol ID.
 * This is the pure parsing step -- no file I/O, no Vite plugin context needed.
 */
export async function parseSvg (
	raw: string,
	file: string,
	symbolIdGen?: SymbolIdGenerator
): Promise<{ xml: any; id: string }> {
	const xml = await parseXml(raw)

	if (!xml || !('svg' in xml)) {
		throw new Error(`Could not load SVG: invalid or non-SVG XML (in ${file})`)
	}

	if (typeof xml.svg !== 'object') xml.svg = { _: xml.svg }
	xml.svg.$ = xml.svg.$ ?? {}
	xml.svg.$.id = symbolIdGen?.(file, raw) || generateId(raw)

	return { xml, id: xml.svg.$.id as string }
}

export type SvgTransformConfig = {
	restoreMissingViewBox?: boolean | undefined
	setFillStrokeColor?: boolean | string | undefined
	preserveWidthHeight?: boolean | undefined
	setWidthHeight?: { width: string; height: string } | undefined
	skipRecolor?: boolean | undefined
}

/**
 * Apply SVG attribute transformations (viewBox restoration, fill/stroke recoloring,
 * width/height manipulation). Mutates the xml2js object in place and returns
 * viewBox metadata.
 */
export async function transformSvg (
	xml: any,
	config: SvgTransformConfig
): Promise<{ viewBox: string; width: string; height: string }> {
	// Add viewbox if missing
	if (config.restoreMissingViewBox && !xml.svg.$.viewBox && xml.svg.$.width && xml.svg.$.height) {
		xml.svg.$.viewBox = `0 0 ${xml.svg.$.width} ${xml.svg.$.height}`
	}

	// Transform fill and stroke if configured
	if (config.setFillStrokeColor && !config.skipRecolor) {
		await setFillStrokeColor(config.setFillStrokeColor, xml)
	}

	if (!config.preserveWidthHeight) {
		delete xml.svg.$.width
		delete xml.svg.$.height
	}

	if (config.setWidthHeight && !xml.svg.$.width && !xml.svg.$.height) {
		xml.svg.$.width = config.setWidthHeight.width
		xml.svg.$.height = config.setWidthHeight.height
	}

	return {
		viewBox: xml.svg.$.viewBox,
		width: xml.svg.$.width,
		height: xml.svg.$.height
	}
}

/**
 * Generate module code for file mode: keeps the original export default (URL string).
 * The caller should pass the full code as `code`.
 */
export function generateFileCode (code: string): string {
	return code
}

/**
 * Generate module code for dev mode: uses createSvgDEV with inline SVG content.
 */
export function generateDevCode (target: SupportedTarget, preamble: string, xml: any): string {
	return [ preamble, generateDev(target, xml) ].join('\n')
}

/**
 * Generate module code for dev-inline mode: hashes the symbol ID, emits a
 * createSvg call with a fragment reference, and appends the inline symbol IIFE.
 */
export function generateDevInlineCode (target: SupportedTarget, preamble: string, xml: any): string {
	xml.svg.$.id = generateId(xml.svg.$.id)
	return [
		preamble,
		generateProd(target, xml.svg.$.viewBox, xml.svg.$.width, xml.svg.$.height, `'#${xml.svg.$.id}'`),
		inlineSymbol(xml),
	].join('\n')
}

/**
 * Generate module code for prod-inline mode: emits a createSvg call with a
 * fragment reference to a symbol that will be inlined in the HTML.
 */
export function generateProdInlineCode (
	target: SupportedTarget,
	preamble: string,
	viewBox: { viewBox: string; width: string; height: string },
	symbolId: string,
): string {
	return [
		preamble,
		generateProd(target, viewBox.viewBox, viewBox.width, viewBox.height, `'#${symbolId}'`),
	].join('\n')
}

/**
 * Generate module code for prod-sprite mode: emits a createSvg call with a
 * placeholder that will be replaced with the sprite URL during renderChunk.
 */
export function generateProdSpriteCode (
	target: SupportedTarget,
	preamble: string,
	viewBox: { viewBox: string; width: string; height: string },
	symbolId: string,
): string {
	return [
		preamble,
		generateProd(target, viewBox.viewBox, viewBox.width, viewBox.height, `__MAGICAL_SVG_SPRITE__${symbolId}__`),
	].join('\n')
}
