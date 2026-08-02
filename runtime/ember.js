import { template } from "@ember/template-compiler";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => {
  let _hoisted_scope = { width, height, symbol }
  return template(`<svg width={{width}} height={{height}} ...attributes><use href={{symbol}} /></svg>`, {
    scope: () => _hoisted_scope
  });
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => {
  let _hoisted_scope = { width, height, xml }
  return template(`<svg width={{width}} height={{height}} ...attributes>{{{xml}}}</svg>`, {
    scope: () => _hoisted_scope
  });
};
