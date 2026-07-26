import type { ParserOptions } from 'xml2js'

const HTML_ENTITIES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&#34;',
	"'": '&#39;',
}

export function stringify(xml: any): string {
	if (typeof xml === 'string') return xml.replace(/[<>&"']/g, (m) => HTML_ENTITIES[m as never] || m)
	if (xml['#name'] === '__text__') return stringify(xml._)
	if (Array.isArray(xml)) return xml.map((x) => stringify(x)).join('')
	if (!('#name' in xml)) return stringify(Object.values(xml))

	const tag = xml['#name']
	const attr = Object.entries(xml.$ || {})
	const children = xml.$$ || xml._

	const renderedAttr = attr.map(([k, v]) => ` ${k}="${v}"`).join('')
	return children
		? `<${tag}${renderedAttr}>${stringify(children)}</${tag}>`
		: `<${tag}${renderedAttr}/>`
}

/** @internal */
export const XML2JS_PARSE_OPTS: ParserOptions = {
	explicitChildren: true,
	preserveChildrenOrder: true,
	charsAsChildren: true,
}
