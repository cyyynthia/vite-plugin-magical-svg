import { h } from "preact";
import { forwardRef } from "preact/compat";

/*@__NO_SIDE_EFFECTS__*/
export const createSvg = (viewBox, symbol) => {
	const node = h("use", { href: symbol });

	return forwardRef((props, ref) => {
		return h("svg", { ref, viewBox, ...props }, node);
	});
};

/*@__NO_SIDE_EFFECTS__*/
export const createSvgDEV = (viewBox, xml) => {
	return forwardRef((props, ref) => {
		return h("svg", {
			ref,
			viewBox,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
