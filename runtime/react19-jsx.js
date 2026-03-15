import { jsx } from 'react/jsx-runtime'

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
	let node = jsx('use', { href: symbol })

	return (props) => jsx('svg', { viewBox, width, height, ...props, children: node })
}

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
	return (props) =>
		jsx('svg', {
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml }
		})
}
