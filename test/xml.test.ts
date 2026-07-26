import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { Builder, parseStringPromise } from 'xml2js'

import { stringify, XML2JS_PARSE_OPTS } from '../src/xml.ts'

const FIXTURES = resolve(import.meta.dirname, 'fixtures')
const fixture = (name: string) => resolve(FIXTURES, name)

it.fails('should roundtrip properly with xml2js alone', async () => {
	const xml1 = await parseStringPromise('<xml><foo>Bar1</foo><bar>wow</bar><foo>Bar2</foo></xml>')
	const xml2 = await parseStringPromise('<xml><foo>Bar2</foo><bar>wow</bar><foo>Bar1</foo></xml>')

	const str1 = new Builder({ headless: true, renderOpts: { pretty: false } }).buildObject(xml1)
	const str2 = new Builder({ headless: true, renderOpts: { pretty: false } }).buildObject(xml2)

	expect(str1).toBe('<xml><foo>Bar1</foo><bar>wow</bar><foo>Bar2</foo></xml>')
	expect(str2).toBe('<xml><foo>Bar2</foo><bar>wow</bar><foo>Bar1</foo></xml>')
})

it('should stringify xml from xml2js with `preserveChildrenOrder` and `explicitChildren`', async () => {
	const xml1 = await parseStringPromise('<xml><foo>Bar1</foo><bar>wow</bar><foo>Bar2</foo></xml>', XML2JS_PARSE_OPTS)
	const xml2 = await parseStringPromise('<xml><foo>Bar2</foo><bar>wow</bar><foo>Bar1</foo></xml>', XML2JS_PARSE_OPTS)

	const str1 = stringify(xml1.xml)
	const str2 = stringify(xml2.xml)

	expect(str1).toBe('<xml><foo>Bar1</foo><bar>wow</bar><foo>Bar2</foo></xml>')
	expect(str2).toBe('<xml><foo>Bar2</foo><bar>wow</bar><foo>Bar1</foo></xml>')
})

it('should round-trip the fixture from xml2js repo', async () => {
	const raw = await readFile(fixture('xml2js.xml'), 'utf8')
	const xml = await parseStringPromise(raw, XML2JS_PARSE_OPTS)
	const res = stringify(xml)

	expect(res).toMatchSnapshot()
})

it('should escape html entities', async () => {
	const raw = '<p>hey this is an evil &lt;script&gt;!! <span>&lt;&gt;&amp;&#39;&#34;</span></p>'
	const xml = await parseStringPromise(raw, XML2JS_PARSE_OPTS)
	const res = stringify(xml)

	expect(res).toBe(raw)
})
