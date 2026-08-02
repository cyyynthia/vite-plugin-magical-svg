import { forwardRef } from "preact/compat";
import { jsx } from "preact/jsx-runtime";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
	let node = jsx("use", { href: symbol });

	return forwardRef((props, ref) => {
		return jsx("svg", { ref, width, height, ...props, children: node });
	});
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
	return forwardRef((props, ref) => {
		return jsx("svg", {
			ref,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
