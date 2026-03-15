import { createElement } from 'react'

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
	let node = createElement('use', { href: symbol })

	return (props) => createElement('svg', { viewBox, width, height, ...props }, node)
}

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
	return (props) =>
		createElement('svg', {
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml }
		})
}
