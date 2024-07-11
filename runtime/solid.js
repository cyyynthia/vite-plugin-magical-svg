import { template, spread } from "solid-js/web";

/*@__NO_SIDE_EFFECTS__*/
export const createIcon = (viewBox, symbol) => {
	const tmpl = template(`<svg viewBox="${viewBox}"><use href="${symbol}">`);

	return (props) => {
		var el = tmpl();
		spread(el, props, true, true);
		return el;
	};
};

/*@__NO_SIDE_EFFECTS__*/
export const createIconDEV = (viewBox, xml) => {
	const tmpl = template(`<svg viewBox="${viewBox}">${xml}`);

	return (props) => {
		var el = tmpl();
		spread(el, props, true, true);
		return el;
	};
};
