import type { Plugin } from 'vite';
import Generators from './codegen.js';
type SymbolIdGenerator = (file: string, raw: string) => string | null | void;
export type MagicalSvgConfig = {
    target?: keyof typeof Generators;
    symbolId?: SymbolIdGenerator;
    svgo?: boolean;
};
export default function (config?: MagicalSvgConfig): Plugin;
export {};
