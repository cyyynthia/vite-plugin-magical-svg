export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	let use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);
	use.setAttribute("href", symbol);
	svg.appendChild(use);
	return svg;
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);
	svg.innerHTML = xml;
	return svg;
};
