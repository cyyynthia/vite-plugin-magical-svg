import { createElementBlock, createElementVNode, markRaw, openBlock } from "vue";

export var createSvg = /*@__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
	// <svg viewBox="{{viewBox}}" width="{{width}}" height="{{height}}"><use href="{{symbol}}" /></svg>
	let _hoisted_1 = { viewBox, width, height };
	let _hoisted_2 = createElementVNode("use", { href: symbol }, null, -1);
	let _hoisted_3 = [_hoisted_2];

	return markRaw({
		render: (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", _hoisted_1, _hoisted_3);
		},
	});
};

export var createSvgDEV = /*@__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
	// <svg viewBox="{{viewBox}}" width="{{width}}" height="{{height}}" innerHTML="{{xml}}"></svg>
	let _hoisted_1 = { viewBox, width, height, innerHTML: xml };

	return markRaw({
		render: (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", _hoisted_1);
		},
	});
};
