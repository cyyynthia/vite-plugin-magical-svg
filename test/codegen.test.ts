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

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
	parseSvg,
	transformSvg,
	hashSymbols,
	generateFileCode,
	generateDevCode,
	generateDevInlineCode,
	generateProdInlineCode,
	generateProdSpriteCode,
} from '../src/transform.js'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')
const fixture = (name: string) => resolve(FIXTURES, name)

describe('generateFileCode', () => {
	it('passes through the original code', () => {
		const code = 'import "./dep.svg";\nexport default "/assets/icon.abc12345.svg"'
		const result = generateFileCode(code)

		expect(result).toMatchSnapshot()
	})
})

describe.each([
	'dom',
	'dom-fn',
	'dom-template',
	'react',
	'react-jsx',
	'react19',
	'react19-jsx',
	'preact',
	'preact-jsx',
	'vue',
	'vue-vapor',
	'solid',
	'ember',
] as const)('%s target', (target) => {
	it('generates dev code', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')
		await transformSvg(xml, {})
		await hashSymbols(xml.svg)

		const result = generateDevCode(target, '', xml)

		expect(result).toMatchSnapshot()
	})

	it('generates dev-inline code with inlineSymbol', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')
		await transformSvg(xml, {})

		const result = generateDevInlineCode(target, '', xml)

		expect(result).toMatchSnapshot()
		expect(result).toContain('document.createElementNS')
		expect(result).toContain('document.body.prepend')
	})

	it('generates prod-inline code with symbol reference', () => {
		const result = generateProdInlineCode(
			target,
			'import "./dep.svg";\n',
			{ viewBox: '0 0 24 24', width: '', height: '' },
			'_abc12345',
		)

		expect(result).toMatchSnapshot()
		expect(result).toContain("'#_abc12345'")
	})

	describe('generateProdSpriteCode', () => {
		it('generates prod-sprite code with placeholder', () => {
			const result = generateProdSpriteCode(
				target,
				'',
				{ viewBox: '0 0 24 24', width: '', height: '' },
				'_abc12345',
			)

			expect(result).toMatchSnapshot()
			expect(result).toContain('__MAGICAL_SVG_SPRITE___abc12345__')
		})

		it('includes preamble imports', () => {
			const preamble = 'import "/path/to/dep.svg";\n'
			const result = generateProdSpriteCode(
				target,
				preamble,
				{ viewBox: '0 0 16 16', width: '16', height: '16' },
				'_def67890',
			)

			expect(result).toMatchSnapshot()
			expect(result).toContain('import "/path/to/dep.svg"')
		})

		it('passes viewBox, width, and height to codegen', () => {
			const result = generateProdSpriteCode(
				target,
				'',
				{ viewBox: '0 0 48 48', width: '48', height: '48' },
				'_test1234',
			)

			expect(result).toMatchSnapshot()
			expect(result).toContain("'0 0 48 48'")
			expect(result).toContain("'48'")
		})
	})
})
