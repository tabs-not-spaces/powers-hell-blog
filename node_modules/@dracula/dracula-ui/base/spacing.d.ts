declare const padding: {
    none: string;
    xxs: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
};
declare type paddingType = keyof typeof padding;
export declare type PaddingMixin = {
    p?: paddingType;
    py?: paddingType;
    px?: paddingType;
    pt?: paddingType;
    pb?: paddingType;
    pl?: paddingType;
    pr?: paddingType;
};
export declare function paddingMixin(mixin: PaddingMixin): string[];
declare const margin: {
    auto: string;
    none: string;
    xxs: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
};
declare type marginType = keyof typeof margin;
export declare type MarginMixin = {
    m?: marginType;
    my?: marginType;
    mx?: marginType;
    mt?: marginType;
    mb?: marginType;
    ml?: marginType;
    mr?: marginType;
};
export declare function marginMixin(mixin: MarginMixin): string[];
export declare const spacingUtilities: {
    classes: {
        padding: string[];
        margin: string[];
    };
    react: {
        padding: string[];
        margin: string[];
    };
};
/**
 * Removes all spacing props from props object
 */
export declare function cleanProps<T>(props: T & Partial<PaddingMixin> & Partial<MarginMixin>): Pick<T, Exclude<keyof T, "p" | "px" | "py" | "pt" | "pb" | "pl" | "pr" | "m" | "mx" | "my" | "mt" | "mb" | "ml" | "mr">>;
export {};
