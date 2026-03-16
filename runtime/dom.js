// A solid-like use of <template> would be shorter, but this is done the "old" way to avoid relying on innerHTML
// in production so that it can be used in places where there have strict policies about that (such as AMO)

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => () => {
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	let use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	viewBox && svg.setAttribute("viewBox", viewBox);
	width && svg.setAttribute("width", width);
	height && svg.setAttribute("height", height);
	use.setAttribute("href", symbol);
	svg.appendChild(use);
	return svg;
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => () => {
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	viewBox && svg.setAttribute("viewBox", viewBox);
	width && svg.setAttribute("width", width);
	height && svg.setAttribute("height", height);
	svg.innerHTML = xml;
	return svg;
};
