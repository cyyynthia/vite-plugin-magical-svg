import { jsx } from "react/jsx-runtime";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
	let node = jsx("use", { href: symbol });

	return (props) =>
		jsx("svg", { width, height, ...props, children: node });
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
	return (props) =>
		jsx("svg", {
			width,
			height,
			...props,
			dangerouslySetInnerHTML: { __html: xml },
		});
};
