export const createSvg = (viewBox, symbol) => {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	svg.setAttribute("viewBox", viewBox);
	use.setAttribute("href", symbol);
	svg.appendChild(use);
	return svg;
};

export const createSvgDEV = (viewBox, xml) => {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", viewBox);
	svg.innerHTML = xml;
	return svg;
};
