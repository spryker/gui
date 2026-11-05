import { getStyleProperty } from '@tiptap/core';
import { Color, TextStyle } from '@tiptap/extension-text-style';

// Summernote's default config (styleWithCSS: false) lets the browser write colour as <font color>. It is read
// into the colour mark and saved as <span style="color">; <font> itself is never written.

export const LegacyFontTextStyle = TextStyle.extend({
    parseHTML() {
        return [...(this.parent?.() ?? []), { tag: 'font[color]', consuming: false }];
    },
});

const parseColor = (element: HTMLElement): string | null => {
    const color = element.tagName === 'FONT' ? element.getAttribute('color') : getStyleProperty(element, 'color');

    return color?.replace(/['"]+/g, '') || null;
};

export const LegacyFontColor = Color.extend({
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    color: {
                        default: null,
                        parseHTML: parseColor,
                        renderHTML: (attributes: { color?: string | null }) =>
                            attributes.color ? { style: `color: ${attributes.color}` } : {},
                    },
                },
            },
        ];
    },
});
