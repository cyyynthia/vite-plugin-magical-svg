import { forwardRef, version } from "react";
import { jsx } from "react/jsx-runtime";

export var createSvg = /*@__NO_SIDE_EFFECTS__*/ (
	viewBox,
	width,
	height,
	symbol
) => {
	let node = jsx("use", { href: symbol });

	if (version.split(".")[0] < "19") {
		return forwardRef((props, ref) => {
			return jsx("svg", {
				ref,
				viewBox,
				width,
				height,
				...props,
				children: node,
			});
		});
	} else {
		return jsx("svg", { ref, viewBox, width, height, children: node });
	}
};

export var createSvgDEV = /*@__NO_SIDE_EFFECTS__*/ (
	viewBox,
	width,
	height,
	xml
) => {
	if (version.split(".")[0] < "19") {
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
	} else {
		return jsx("svg", {
			ref,
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	}
};
