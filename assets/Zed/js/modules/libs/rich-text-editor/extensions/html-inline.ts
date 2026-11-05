import { Mark } from '@tiptap/core';
import type { AnyExtension } from '@tiptap/core';
import {
    HTML_ELEMENT_EXTENSION_PRIORITY,
    HTML_INLINE_TAGS,
    createElementWithAttributes,
    readHtmlAttributes,
} from './html-elements';
import type { HtmlAttributes } from './html-elements';

const toMarkName = (tag: string): string => `html${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;

const createHtmlInlineMark = (tag: string) =>
    Mark.create({
        name: toMarkName(tag),
        priority: HTML_ELEMENT_EXTENSION_PRIORITY,
        // Text typed after an abbreviation or a date is not part of it.
        inclusive: false,

        addAttributes() {
            // Parsed as a whole by the rule below.
            return { htmlAttributes: { default: {}, parseHTML: () => null, rendered: false } };
        },

        parseHTML() {
            return [
                {
                    tag,
                    getAttrs: (element: HTMLElement) => {
                        const htmlAttributes = readHtmlAttributes(element);

                        return htmlAttributes === null ? false : { htmlAttributes };
                    },
                },
            ];
        },

        renderHTML({ mark }) {
            const dom = createElementWithAttributes(tag, mark.attrs.htmlAttributes as HtmlAttributes);

            return { dom, contentDOM: dom };
        },
    });

/** One mark per text-level element, each keeping its tag and attributes. */
export const createHtmlInlineMarks = (): AnyExtension[] => HTML_INLINE_TAGS.map(createHtmlInlineMark);
