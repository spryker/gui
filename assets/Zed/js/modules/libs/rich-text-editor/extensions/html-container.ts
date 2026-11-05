import { Node } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
    HTML_ELEMENT_EXTENSION_PRIORITY,
    HTML_INLINE_TAGS,
    createElementWithAttributes,
    readHtmlAttributes,
} from './html-elements';
import type { HtmlAttributes } from './html-elements';

export const HTML_BLOCK_CONTAINER_NODE_NAME = 'htmlBlockContainer';
const HTML_INLINE_CONTAINER_NODE_NAME = 'htmlInlineContainer';
// Added in the editor only (node view), so the otherwise invisible wrapper can be seen; never saved.
export const HTML_CONTAINER_VIEW_CLASS = 'rich-text-editor__container';

/**
 * Flow-content elements whose children are ordinary content. Elements with a fixed content model (`dl`, `details`)
 * or their own behaviour (`summary`, media) are not containers and stay with the content guard.
 */
export const HTML_CONTAINER_TAGS: readonly string[] = [
    'div',
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'main',
    'figure',
    'figcaption',
    'address',
    'hgroup',
    'search',
];

const DEFAULT_TAG = 'div';

// Phrasing elements of the other extensions (marks, image, line break); with the text-level elements, every element a
// text block holds. Every other element is a block.
const FORMATTING_TAGS = [
    'a',
    'b',
    'br',
    'code',
    'del',
    'em',
    'font',
    'i',
    'img',
    'ins',
    's',
    'span',
    'strike',
    'strong',
    'sub',
    'sup',
    'u',
    'wbr',
];
const INLINE_TAGS = new Set([...FORMATTING_TAGS, ...HTML_INLINE_TAGS].map((tag) => tag.toUpperCase()));

// The parser drops this whitespace of indented HTML between blocks; a non-breaking space is content.
const CONTENT_TEXT = /[^ \t\r\n\f]/;

interface ContainerAttributes {
    tag: string;
    htmlAttributes: HtmlAttributes;
}

// A non-editable element is a feature's widget (a ContentGui content item), which the schema reads as a block.
const isBlockElement = (element: Element): boolean =>
    !INLINE_TAGS.has(element.tagName) || element.getAttribute('contenteditable') === 'false';

const hasInlineChild = (element: HTMLElement): boolean =>
    [...element.childNodes].some((child) =>
        child instanceof Element ? !isBlockElement(child) : CONTENT_TEXT.test(child.textContent ?? ''),
    );

/**
 * A container holds either blocks or inline content. One mixing both would get a paragraph around its loose content
 * on save, so it matches neither node and is left to the content guard.
 */
const readContainer = (element: HTMLElement, isBlockContent: boolean): ContainerAttributes | false => {
    const htmlAttributes = readHtmlAttributes(element);
    const hasBlockChild = [...element.children].some(isBlockElement);

    if (htmlAttributes === null || hasBlockChild !== isBlockContent || (hasBlockChild && hasInlineChild(element))) {
        return false;
    }

    return { tag: element.tagName.toLowerCase(), htmlAttributes };
};

const toContainerTag = (tag: unknown): string =>
    typeof tag === 'string' && HTML_CONTAINER_TAGS.includes(tag) ? tag : DEFAULT_TAG;

const createContainerElement = (node: ProseMirrorNode): HTMLElement =>
    createElementWithAttributes(toContainerTag(node.attrs.tag), node.attrs.htmlAttributes as HtmlAttributes);

const createContainerNode = (name: string, content: string, isBlockContent: boolean) =>
    Node.create({
        name,
        priority: HTML_ELEMENT_EXTENSION_PRIORITY,
        group: 'block',
        content,
        defining: true,

        addAttributes() {
            // Parsed as a whole by the rules below.
            return {
                tag: { default: DEFAULT_TAG, parseHTML: () => null, rendered: false },
                htmlAttributes: { default: {}, parseHTML: () => null, rendered: false },
            };
        },

        parseHTML() {
            return HTML_CONTAINER_TAGS.map((tag) => ({
                tag,
                getAttrs: (element: HTMLElement) => readContainer(element, isBlockContent),
            }));
        },

        renderHTML({ node }) {
            const dom = createContainerElement(node);

            return { dom, contentDOM: dom };
        },

        addNodeView() {
            return ({ node }) => {
                const dom = createContainerElement(node);
                dom.classList.add(HTML_CONTAINER_VIEW_CLASS);

                return { dom, contentDOM: dom };
            };
        },
    });

/** A layout element around blocks (`<div><p>…</p></div>`), kept with its tag and attributes. */
export const HtmlBlockContainer = createContainerNode(HTML_BLOCK_CONTAINER_NODE_NAME, 'block+', true);

/** A layout element around text and images (`<div><img><br></div>`), kept with its tag and attributes. */
export const HtmlInlineContainer = createContainerNode(HTML_INLINE_CONTAINER_NODE_NAME, 'inline*', false);
