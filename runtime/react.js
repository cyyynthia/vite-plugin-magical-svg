import { createElement, forwardRef, version } from "react";

export var createSvg = /*@__NO_SIDE_EFFECTS__*/ (
	viewBox,
	width,
	height,
	symbol
) => {
	let node = createElement("use", { href: symbol });

	if (version.split(".")[0] < "19") {
		return forwardRef((props, ref) => {
			return createElement(
				"svg",
				{ ref, viewBox, width, height, ...props },
				node
			);
		});
	} else {
		return createElement(
			"svg",
			{ ref, viewBox, width, height, ...props },
			node
		);
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
			return createElement("svg", {
				ref,
				viewBox,
				width,
				height,
				...props,
				dangerouslySetInnerHTML: { __html: xml },
			});
		});
	} else {
		return createElement("svg", {
			ref,
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
	}
};
