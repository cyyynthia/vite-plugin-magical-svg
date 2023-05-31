declare const codegen: {
    dom: {
        dev: (xml: any) => string;
        prod: (viewBox: string, symbol: string) => string;
    };
    react: {
        dev: (xml: any) => string;
        prod: (viewBox: string, symbol: string) => string;
    };
    preact: {
        dev: (xml: any) => string;
        prod: (viewBox: string, symbol: string) => string;
    };
};
export declare function inlineSymbol(xml: any): string;
export default codegen;
