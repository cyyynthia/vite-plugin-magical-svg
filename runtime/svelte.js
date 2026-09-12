import { createRawSnippet } from "svelte";

const template = /*#__NO_SIDE_EFFECTS__*/ (svg) => createRawSnippet(() => ({ render: () => svg }));

export var createSvg = /*#__NO_SIDE_EFFECTS__*/ (symbol, width, height) => template(`<svg width=${width} height=${height}><use href=${symbol}>`);

export var createSvgDEV = /*#__NO_SIDE_EFFECTS__*/ (xml, width, height) => template(`<svg width=${width} height=${height}>${xml}`);
