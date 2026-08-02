import { markRaw, template } from "vue";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) =>
	// <svg width="{{width}}" height="{{height}}"><use href="{{symbol}}" /></svg>
	markRaw({
		render: template(
			`<svg width=${width} height=${height}><use href=${symbol}>`,
			true,
		)
	});

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) =>
	// <svg width="{{width}}" height="{{height}}" innerHTML="{{xml}}"></svg>
	markRaw({
		render: template(
			`<svg width=${width} height=${height}>${xml}`,
			true,
		)
	});
