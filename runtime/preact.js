import { h } from "preact";
import { forwardRef } from "preact/compat";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
	let node = h("use", { href: symbol });

	return forwardRef((props, ref) => {
		return h("svg", { ref, width, height, ...props }, node);
	});
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
	return forwardRef((props, ref) => {
		return h("svg", {
			ref,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
