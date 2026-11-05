export type HtmlAttributes = Readonly<Record<string, string>>;

/**
 * Below the default extension priority (100): parse rules of equal priority apply in extension order, so a feature's
 * node or mark for one of these tags (an `aside` widget) is read first. A lower rule priority is not possible, as the
 * content guard's catch-all rule has the default one and would then claim every element.
 */
export const HTML_ELEMENT_EXTENSION_PRIORITY = 50;

/**
 * Text-level elements no other mark represents. Their order is the nesting order on save: on text carrying several of
 * them, an earlier one is written around a later one, and all of them inside the formatting marks (bold, link, …).
 */
export const HTML_INLINE_TAGS: readonly string[] = [
    'mark',
    'small',
    'abbr',
    'cite',
    'dfn',
    'q',
    'time',
    'data',
    'kbd',
    'samp',
    'var',
    'bdi',
    'bdo',
];

const EVENT_HANDLER_PREFIX = 'on';
// The editor keeps its own editing state; a stored contenteditable would make parts of the field read-only or editable.
const EDITING_ATTRIBUTE = 'contenteditable';
const SCRIPT_ADDRESS = /^(?:javascript|vbscript):/i;
// Browsers ignore these characters in an address ("java\tscript:" still runs), so they are ignored before the check.
const LAST_IGNORED_ADDRESS_CHARACTER_CODE = 0x20;

const isScriptAddress = (value: string): boolean =>
    SCRIPT_ADDRESS.test(
        [...value].filter((character) => character.charCodeAt(0) > LAST_IGNORED_ADDRESS_CHARACTER_CODE).join(''),
    );

const isUnsafeAttribute = (name: string, value: string): boolean => {
    const attributeName = name.toLowerCase();

    return (
        attributeName.startsWith(EVENT_HANDLER_PREFIX) || attributeName === EDITING_ATTRIBUTE || isScriptAddress(value)
    );
};

/**
 * Every attribute of an element the editor keeps as it is, or null when one of them would run script or change editing
 * in the Back Office page: such an element is left to the content guard.
 */
export const readHtmlAttributes = (element: HTMLElement): HtmlAttributes | null => {
    const attributes = [...element.attributes];

    if (attributes.some(({ name, value }) => isUnsafeAttribute(name, value))) {
        return null;
    }

    return Object.fromEntries(attributes.map(({ name, value }) => [name, value]));
};

/**
 * The element with its attributes exactly as stored. ProseMirror's own rendering writes `style` through the CSS object
 * model, which rewrites it and drops what the browser cannot parse (e.g. Twig in a `url()`). Parsed HTML never holds an
 * unsafe attribute; content set as JSON might, so those are skipped here too.
 */
export const createElementWithAttributes = (tag: string, attributes: HtmlAttributes): HTMLElement => {
    const element = document.createElement(tag);

    Object.entries(attributes)
        .filter(([name, value]) => !isUnsafeAttribute(name, value))
        .forEach(([name, value]) => element.setAttribute(name, value));

    return element;
};
