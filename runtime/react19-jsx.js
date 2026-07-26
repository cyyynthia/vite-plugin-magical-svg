import { jsx } from "react/jsx-runtime";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => {
	let node = jsx("use", { href: symbol });

	return (props) =>
		jsx("svg", { viewBox, width, height, ...props, children: node });
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => {
	return (props) =>
		jsx("svg", {
			viewBox,
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
};
