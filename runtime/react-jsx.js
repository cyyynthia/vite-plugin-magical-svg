import { forwardRef } from "react";
import { jsx } from "react/jsx-runtime";

/*@__NO_SIDE_EFFECTS__*/
export const createSvg = (viewBox, symbol) => {
	const node = jsx("use", { href: symbol });

	return forwardRef((props, ref) => {
		return jsx("svg", { ref, viewBox, ...props, children: node });
	});
};

/*@__NO_SIDE_EFFECTS__*/
export const createSvgDEV = (viewBox, xml) => {
	return forwardRef((props, ref) => {
		return jsx("svg", {
			ref,
			viewBox,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	});
};
