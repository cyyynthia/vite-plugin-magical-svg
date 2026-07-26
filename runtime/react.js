import { createElement, forwardRef } from "react";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => {
	let node = createElement("use", { href: symbol });

	return forwardRef((props, ref) => {
		return createElement("svg", { ref, viewBox, width, height, ...props }, node);
	});
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => {
	return forwardRef((props, ref) => {
		return createElement("svg", {
			ref,
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
