import React, { InputHTMLAttributes } from 'react';
import { BaseColorMap } from '../../base/colors';
import { MarginMixin, PaddingMixin } from '../../base/spacing';
export declare const inputVariants: {
    normal: string;
    outline: string;
};
export declare const inputSizes: {
    lg: string;
    md: string;
    sm: string;
};
export declare const borderSizes: {
    lg: string;
    md: string;
    sm: string;
};
export declare const inputColors: BaseColorMap & {
    white: string;
};
/** Input Props */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>, PaddingMixin, MarginMixin {
    /**
     * The Dracula UI theme color to be used
     */
    color?: keyof typeof inputColors;
    /**
     * Controls the size of the input based on pre-configured Dracula UI sizes.
     */
    size?: keyof typeof inputSizes | number;
    /**
     * Controls the border size of the input based on pre-configured Dracula UI sizes.
     */
    borderSize?: keyof typeof borderSizes;
    /**
     * Controls the variation the input.
     * `normal` -> Regular Input component with a light background color.
     * `outline` -> Keeps the accent color, but removes the background.
     */
    variant?: keyof typeof inputVariants;
    /**
     * Controls the type of the input.
     */
    type?: 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';
}
/**
 * Input is a styled HTML Input.
 *
 * There are no behavior changes applied to the native HTML tag other
 * than light styling done via CSS in order to keep inputs accessible.
 */
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
