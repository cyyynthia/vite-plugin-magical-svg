import { h } from "preact";
import { forwardRef } from "preact/compat";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
	let node = h("use", { href: symbol });

	return forwardRef((props, ref) => {
		return h("svg", { ref, viewBox, width, height, ...props }, node);
	});
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
	return forwardRef((props, ref) => {
		return h("svg", {
			ref,
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
