import { markRaw, template } from "vue";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) =>
	// <svg viewBox="{{viewBox}}" width="{{width}}" height="{{height}}"><use href="{{symbol}}" /></svg>
	markRaw({
		render: template(
			`<svg${viewBox ? ` viewBox="${viewBox}"` : ''}${width ? ` width=${width}` : ''}${height ? ` height=${height}` : ''}><use href=${symbol}>`,
			true,
		)
	});

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) =>
	// <svg viewBox="{{viewBox}}" width="{{width}}" height="{{height}}" innerHTML="{{xml}}"></svg>
	markRaw({
		render: template(
			`<svg${viewBox ? ` viewBox="${viewBox}` : ''}${width ? ` width=${width}` : ''}${height ? ` height=${height}` : ''}>${xml}`,
			true,
		)
	});
