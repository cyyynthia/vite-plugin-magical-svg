var template = (html) => {
	const tmpl = document.createElement("template");
	tmpl.innerHTML = html;

	return tmpl.content.firstChild;
};

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => () => template(`<svg width=${width} height=${height}><use href=${symbol}>`);

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => () =>  template(`<svg width=${width} height=${height}>${xml}`);
