import { template } from "@ember/template-compiler";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, viewBox, width, height) => {
  let _hoisted_scope = { viewBox, width, height, symbol }
  return template(`<svg viewBox={{viewBox}} width={{width}} height={{height}} ...attributes><use href={{symbol}} /></svg>`, {
    scope: () => _hoisted_scope
  });
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, viewBox, width, height) => {
  let _hoisted_scope = { viewBox, width, height, xml }
  return template(`<svg viewBox={{viewBox}} width={{width}} height={{height}} ...attributes>{{{xml}}}</svg>`, {
    scope: () => _hoisted_scope
  });
};
