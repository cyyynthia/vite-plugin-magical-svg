import { createElement } from "react";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
	let node = createElement("use", { href: symbol });

	return (props) =>
		createElement("svg", { width, height, ...props }, node);
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
	return (props) =>
		createElement("svg", {
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
};
