import { template } from "@ember/template-compiler";

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, symbol) => {
  return template(`<svg viewBox={{viewBox}} width={{width}} height={{height}} ...attributes><use href={{symbol}} /></svg>`, {
    scope: () => ({
      viewBox,
      width,
      height,
      symbol
    })
  });
};

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (viewBox, width, height, xml) => {
  return template(`<svg viewBox={{viewBox}} width={{width}} height={{height}} ...attributes>{{{xml}}}</svg>`, {
    scope: () => ({
      viewBox,
      width,
      height,
      xml
    })
  });
};
