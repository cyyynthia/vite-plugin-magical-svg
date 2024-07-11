import {
	createElementBlock,
	createElementVNode,
	markRaw,
	openBlock,
} from "vue";

/*@__NO_SIDE_EFFECTS__*/
export const createSvg = (viewBox, symbol) => {
	// <svg viewBox="{{viewBox}}"><use href="{{symbol}}" /></svg>
	const _hoisted_1 = { viewBox };
	const _hoisted_2 = createElementVNode("use", { href: symbol }, null, -1);
	const _hoisted_3 = [_hoisted_2];

	return markRaw({
		render: (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", _hoisted_1, _hoisted_3);
		},
	});
};

/*@__NO_SIDE_EFFECTS__*/
export const createSvgDEV = (viewBox, xml) => {
	// <svg viewBox="{{viewBox}}" innerHTML="{{xml}}"></svg>
	const _hoisted_1 = { viewBox, innerHTML: xml };

	return markRaw({
		render: (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", _hoisted_1);
		},
	});
};
