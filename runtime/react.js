import { createElement, forwardRef } from "react";

/*@__NO_SIDE_EFFECTS__*/
export const createSvg = (viewBox, symbol) => {
	const node = createElement("use", { href: symbol });

	return forwardRef((props, ref) => {
		return createElement("svg", { ref, viewBox, ...props }, node);
	});
};

/*@__NO_SIDE_EFFECTS__*/
export const createSvgDEV = (viewBox, xml) => {
	return forwardRef((props, ref) => {
		return createElement("svg", {
			ref,
			viewBox,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
