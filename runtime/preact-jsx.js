import { forwardRef } from "preact/compat";
import { jsx } from "preact/jsx-runtime";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
	let node = jsx("use", { href: symbol });

	return forwardRef((props, ref) => {
		return jsx("svg", { ref, viewBox, width, height, ...props, children: node });
	});
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
	return forwardRef((props, ref) => {
		return jsx("svg", {
			ref,
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
