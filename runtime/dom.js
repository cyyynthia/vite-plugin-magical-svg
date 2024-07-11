const template = (html) => {
	const tmpl = document.createElement("template");
	tmpl.innerHTML = html;

	return tmpl.content.firstChild;
};

export const createSvg = (viewBox, symbol) => {
	const tmpl = template(`<svg viewBox="${viewBox}"><use href="${symbol}>`);
	return () => tmpl.cloneNode(true);
};

export const createSvgDEV = (viewBox, xml) => {
	const tmpl = template(`<svg viewBox="${viewBox}">${xml}`);
	return () => tmpl.cloneNode(true);
};
