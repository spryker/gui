import { Node } from '@tiptap/core';

// Wrappers Summernote content commonly contains that no Tiptap node or mark represents on its own. Without
// these rules the content check would flag them, and most tables and coloured text would open in Source mode.
const TABLE_SECTION_TAGS = ['tbody', 'thead', 'tfoot'];
const IGNORED_TAGS = ['colgroup', 'col'];

// The attributes other rules carry into the document (TextStyle reads a span's style, legacyFont a font's colour).
// A wrapper with any other attribute (a class, an id, a <font face>) would lose it, so it is left to the content guard.
// A div is not unwrapped: the HTML containers (html-container.ts) keep it with its attributes.
const CARRIED_WRAPPER_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
    span: ['style'],
    font: ['color'],
};

const carriesEveryAttribute = (element: HTMLElement, carriedAttributes: readonly string[]): boolean =>
    [...element.attributes].every((attribute) => carriedAttributes.includes(attribute.name));

/**
 * Carries parse rules only: the node has no group and appears in no content expression, so it is never
 * instantiated. `skip` parses a wrapper's children in place; the marks on them (TextStyle on a styled
 * `span`, legacyFont on `font[color]`) are applied by their own, earlier rules. Features with more
 * specific rules (a content-item `span`) take precedence through a higher priority.
 */
export const LegacyMarkup = Node.create({
    name: 'legacyMarkup',

    parseHTML() {
        return [
            ...TABLE_SECTION_TAGS.map((tag) => ({ tag, skip: true })),
            ...Object.entries(CARRIED_WRAPPER_ATTRIBUTES).map(([tag, carriedAttributes]) => ({
                tag,
                skip: true,
                getAttrs: (element: HTMLElement) => (carriesEveryAttribute(element, carriedAttributes) ? null : false),
            })),
            ...IGNORED_TAGS.map((tag) => ({ tag, ignore: true })),
        ];
    },

    renderHTML() {
        return ['span'];
    },
});
