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
import type { SupportedTarget } from '../src/codegen.js'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')
const fixture = (name: string) => resolve(FIXTURES, name)

describe('generateFileCode', () => {
	it('passes through the original code', () => {
		const code = 'import "./dep.svg";\nexport default "/assets/icon.abc12345.svg"'
		const result = generateFileCode(code)

		expect(result).toMatchSnapshot()
	})
})

describe('generateDevCode', () => {
	it('generates dev code for dom target', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')
		await transformSvg(xml, {})
		await hashSymbols(xml.svg)

		const result = generateDevCode('dom', '', xml)

		expect(result).toMatchSnapshot()
	})

	for (const target of [
		'react',
		'react-jsx',
		'react19',
		'react19-jsx',
		'preact',
		'preact-jsx',
		'vue',
		'vue-vapor',
		'solid',
	] satisfies SupportedTarget[]) {
		it(`generates dev code for ${target} target`, async () => {
			const raw = await readFile(fixture('simple.svg'), 'utf8')
			const { xml } = await parseSvg(raw, 'simple.svg')
			await transformSvg(xml, {})
			await hashSymbols(xml.svg)

			const result = generateDevCode(target, '', xml)

			expect(result).toMatchSnapshot()
		})
	}
})

describe('generateDevInlineCode', () => {
	it('generates dev-inline code with inlineSymbol', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')
		await transformSvg(xml, {})

		const result = generateDevInlineCode('dom', '', xml)

		expect(result).toMatchSnapshot()
		expect(result).toContain('document.createElementNS')
		expect(result).toContain('document.body.prepend')
	})
})

describe('generateProdInlineCode', () => {
	it('generates prod-inline code with symbol reference', () => {
		const result = generateProdInlineCode(
			'dom',
			'import "./dep.svg";\n',
			{ viewBox: '0 0 24 24', width: '', height: '' },
			'_abc12345',
		)

		expect(result).toMatchSnapshot()
		expect(result).toContain("'#_abc12345'")
	})
})

describe('generateProdSpriteCode', () => {
	it('generates prod-sprite code with placeholder', () => {
		const result = generateProdSpriteCode(
			'dom',
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
			'react',
			preamble,
			{ viewBox: '0 0 16 16', width: '16', height: '16' },
			'_def67890',
		)

		expect(result).toMatchSnapshot()
		expect(result).toContain('import "/path/to/dep.svg"')
	})

	it('passes viewBox, width, and height to codegen', () => {
		const result = generateProdSpriteCode(
			'vue',
			'',
			{ viewBox: '0 0 48 48', width: '48', height: '48' },
			'_test1234',
		)

		expect(result).toMatchSnapshot()
		expect(result).toContain("'0 0 48 48'")
		expect(result).toContain("'48'")
	})
})
