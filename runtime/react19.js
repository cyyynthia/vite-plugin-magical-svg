import { createElement } from "react";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => {
	let node = createElement("use", { href: symbol });

	return (props) =>
		createElement("svg", { viewBox, width, height, ...props }, node);
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => {
	return (props) =>
		createElement("svg", {
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
};
