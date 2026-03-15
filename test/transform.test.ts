import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Builder } from 'xml2js'
import {
	generateId,
	parseSvg,
	transformSvg,
	setFillStrokeColor,
	hashSymbols,
	generateModuleCode
} from '../src/transform.js'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')
const fixture = (name: string) => resolve(FIXTURES, name)

function buildXml(xml: any): string {
	return new Builder({ headless: true }).buildObject(xml)
}

describe('generateId', () => {
	it('produces a deterministic hash prefixed with _', () => {
		const id = generateId('hello world')
		expect(id).toMatch(/^_[0-9a-f]{8}$/)
	})

	it('is stable across calls', () => {
		expect(generateId('test')).toBe(generateId('test'))
	})

	it('produces different ids for different inputs', () => {
		expect(generateId('a')).not.toBe(generateId('b'))
	})
})

describe('parseSvg', () => {
	it('parses a simple SVG and assigns a symbol id', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml, id } = await parseSvg(raw, 'simple.svg')

		expect(id).toMatch(/^_[0-9a-f]{8}$/)
		expect(xml.svg.$.id).toBe(id)
		expect(xml.svg.$.viewBox).toBe('0 0 24 24')
	})

	it('uses a custom symbolId generator when provided', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { id } = await parseSvg(raw, 'simple.svg', () => 'custom-id')

		expect(id).toBe('custom-id')
	})

	it('falls back to hash when symbolId generator returns null', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { id } = await parseSvg(raw, 'simple.svg', () => null)

		expect(id).toMatch(/^_[0-9a-f]{8}$/)
	})

	it('rejects non-SVG XML', async () => {
		await expect(parseSvg('<html></html>', 'bad.svg')).rejects.toThrow('invalid or non-SVG XML')
	})

	it('parses an empty SVG element', async () => {
		const raw = await readFile(fixture('empty.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'empty.svg')

		expect(xml.svg.$).toBeDefined()
		expect(xml.svg.$.id).toMatch(/^_[0-9a-f]{8}$/)
	})
})

describe('transformSvg', () => {
	it('strips width/height by default', async () => {
		const raw = await readFile(fixture('no-viewbox.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'no-viewbox.svg')

		const vb = await transformSvg(xml, {})
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
		expect(vb.width).toBeUndefined()
		expect(vb.height).toBeUndefined()
	})

	it('preserves width/height when configured', async () => {
		const raw = await readFile(fixture('no-viewbox.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'no-viewbox.svg')

		const vb = await transformSvg(xml, { preserveWidthHeight: true })
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
		expect(vb.width).toBe('100')
		expect(vb.height).toBe('100')
	})

	it('restores missing viewBox from width/height', async () => {
		const raw = await readFile(fixture('no-viewbox.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'no-viewbox.svg')

		const vb = await transformSvg(xml, {
			restoreMissingViewBox: true,
			preserveWidthHeight: true
		})
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
		expect(vb.viewBox).toBe('0 0 100 100')
	})

	it('does not overwrite an existing viewBox', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')

		const vb = await transformSvg(xml, { restoreMissingViewBox: true })

		expect(vb.viewBox).toBe('0 0 24 24')
	})

	it('sets width/height when configured and not already present', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')

		// simple.svg has no width/height, only viewBox; preserveWidthHeight is false (default)
		const vb = await transformSvg(xml, {
			setWidthHeight: { width: '1em', height: '1em' }
		})
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
		expect(vb.width).toBe('1em')
		expect(vb.height).toBe('1em')
	})

	it('does not override existing width/height when setWidthHeight is configured', async () => {
		const raw = await readFile(fixture('no-viewbox.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'no-viewbox.svg')

		const vb = await transformSvg(xml, {
			preserveWidthHeight: true,
			setWidthHeight: { width: '2em', height: '2em' }
		})

		// Should keep original 100/100, not override
		expect(vb.width).toBe('100')
		expect(vb.height).toBe('100')
	})
})

describe('setFillStrokeColor', () => {
	it('replaces fill and stroke with currentColor', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')

		await setFillStrokeColor(true, xml)
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
	})

	it('replaces fill and stroke with a custom color', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')

		await setFillStrokeColor('var(--icon-color)', xml)
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
	})

	it('preserves fill="none" and stroke="none"', async () => {
		const raw = await readFile(fixture('multi-colors.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'multi-colors.svg')

		await setFillStrokeColor(true, xml)
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
	})

	it('skips recolor when skipRecolor is set via transformSvg', async () => {
		const raw = await readFile(fixture('simple.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'simple.svg')

		await transformSvg(xml, {
			setFillStrokeColor: true,
			skipRecolor: true
		})
		const result = buildXml(xml)

		// fill should still be #ff0000, not currentColor
		expect(result).toContain('#ff0000')
	})
})

describe('hashSymbols', () => {
	it('hashes use href references', async () => {
		const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<use href="some-ref"/>
		</svg>`
		const { xml } = await parseSvg(raw, 'test.svg')

		await hashSymbols(xml.svg)

		const useEl = xml.svg.use[0]
		expect(useEl.$.href).toMatch(/^#_[0-9a-f]{8}$/)
	})
})

describe('transformSvg full pipeline', () => {
	it('applies all transforms together', async () => {
		const raw = await readFile(fixture('no-viewbox.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'no-viewbox.svg')

		const vb = await transformSvg(xml, {
			restoreMissingViewBox: true,
			setFillStrokeColor: 'currentColor',
			setWidthHeight: { width: '1em', height: '1em' }
		})
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
		expect(vb.viewBox).toBe('0 0 100 100')
		// width/height are stripped (preserveWidthHeight defaults to false),
		// then setWidthHeight applies
		expect(vb.width).toBe('1em')
		expect(vb.height).toBe('1em')
	})

	it('handles SVG with class/aria/data attributes', async () => {
		const raw = await readFile(fixture('with-attrs.svg'), 'utf8')
		const { xml } = await parseSvg(raw, 'with-attrs.svg')

		await transformSvg(xml, { setFillStrokeColor: true })
		const result = buildXml(xml)

		expect(result).toMatchSnapshot()
	})
})
