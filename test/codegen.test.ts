import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseSvg, transformSvg, hashSymbols, generateModuleCode } from '../src/transform.js'
import type { SupportedTarget } from '../src/codegen.js'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')
const fixture = (name: string) => resolve(FIXTURES, name)

describe('generateModuleCode', () => {
	describe('file mode', () => {
		it('passes through the original code', () => {
			const code = 'import "./dep.svg";\nexport default "/assets/icon.abc12345.svg"'
			const result = generateModuleCode({ type: 'file' }, 'dom', code, { viewBox: '', width: '', height: '' })

			expect(result).toMatchSnapshot()
		})
	})

	describe('dev mode', () => {
		it('generates dev code for dom target', async () => {
			const raw = await readFile(fixture('simple.svg'), 'utf8')
			const { xml } = await parseSvg(raw, 'simple.svg')
			await transformSvg(xml, {})
			await hashSymbols(xml.svg)

			const result = generateModuleCode({ type: 'dev', xml }, 'dom', '', {
				viewBox: '0 0 24 24',
				width: '',
				height: ''
			})

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
			'solid'
		] satisfies SupportedTarget[]) {
			it(`generates dev code for ${target} target`, async () => {
				const raw = await readFile(fixture('simple.svg'), 'utf8')
				const { xml } = await parseSvg(raw, 'simple.svg')
				await transformSvg(xml, {})
				await hashSymbols(xml.svg)

				const result = generateModuleCode({ type: 'dev', xml }, target, '', {
					viewBox: '0 0 24 24',
					width: '',
					height: ''
				})

				expect(result).toMatchSnapshot()
			})
		}
	})

	describe('dev-inline mode', () => {
		it('generates dev-inline code with inlineSymbol', async () => {
			const raw = await readFile(fixture('simple.svg'), 'utf8')
			const { xml } = await parseSvg(raw, 'simple.svg')
			await transformSvg(xml, {})

			const result = generateModuleCode({ type: 'dev-inline', xml }, 'dom', '', {
				viewBox: '0 0 24 24',
				width: '',
				height: ''
			})

			expect(result).toMatchSnapshot()
			expect(result).toContain('document.createElementNS')
			expect(result).toContain('document.body.prepend')
		})
	})

	describe('prod-inline mode', () => {
		it('generates prod-inline code with symbol reference', () => {
			const result = generateModuleCode(
				{ type: 'prod-inline', symbolId: '_abc12345' },
				'dom',
				'import "./dep.svg";\n',
				{ viewBox: '0 0 24 24', width: '', height: '' }
			)

			expect(result).toMatchSnapshot()
			expect(result).toContain("'#_abc12345'")
		})
	})

	describe('prod-sprite mode', () => {
		it('generates prod-sprite code with placeholder', () => {
			const result = generateModuleCode({ type: 'prod-sprite', symbolId: '_abc12345' }, 'dom', '', {
				viewBox: '0 0 24 24',
				width: '',
				height: ''
			})

			expect(result).toMatchSnapshot()
			expect(result).toContain('__MAGICAL_SVG_SPRITE___abc12345__')
		})

		it('includes preamble imports', () => {
			const preamble = 'import "/path/to/dep.svg";\n'
			const result = generateModuleCode({ type: 'prod-sprite', symbolId: '_def67890' }, 'react', preamble, {
				viewBox: '0 0 16 16',
				width: '16',
				height: '16'
			})

			expect(result).toMatchSnapshot()
			expect(result).toContain('import "/path/to/dep.svg"')
		})
	})

	describe('with viewBox and dimensions', () => {
		it('passes viewBox, width, and height to codegen', () => {
			const result = generateModuleCode({ type: 'prod-sprite', symbolId: '_test1234' }, 'vue', '', {
				viewBox: '0 0 48 48',
				width: '48',
				height: '48'
			})

			expect(result).toMatchSnapshot()
			expect(result).toContain("'0 0 48 48'")
			expect(result).toContain("'48'")
		})
	})
})
