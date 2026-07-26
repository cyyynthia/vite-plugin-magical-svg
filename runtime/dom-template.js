var template = (html) => {
	const tmpl = document.createElement("template");
	tmpl.innerHTML = html;

	return tmpl.content.firstChild;
};

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => () => template(`<svg ${viewBox ? `viewBox="${viewBox}"` : ''}${width ? `width="${width}"` : ''}${height ? `height="${height}"` : ''}><use href="${symbol}>`);

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => () =>  template(`<svg ${viewBox ? `viewBox="${viewBox}"` : ''}${width ? `width="${width}"` : ''}${height ? `height="${height}"` : ''}>${xml}`);
