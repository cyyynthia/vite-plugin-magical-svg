import { template, spread } from "solid-js/web";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => {
	let tmpl = template(`<svg${viewBox ? ` viewBox="${viewBox}"` : ''}${width ? ` width=${width}` : ''}${height ? ` height=${height}` : ''}><use href=${symbol}>`);

	return (props) => {
		let el = tmpl();
		spread(el, props, true, true);
		return el;
	};
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => {
	let tmpl = template(`<svg${viewBox ? ` viewBox="${viewBox}` : ''}${width ? ` width=${width}` : ''}${height ? ` height=${height}` : ''}>${xml}`);

	return (props) => {
		let el = tmpl();
		spread(el, props, true, true);
		return el;
	};
};
