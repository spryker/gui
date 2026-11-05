// Translations are read from this element, rendered in layout.twig's `rich_text_editor_labels` block
// (@Gui/RichTextEditor/labels.twig); a project overriding the block renders its own.
export const LABELS_ELEMENT_ID = 'spryker-rich-text-editor-labels';

// Features render their own translated labels in JSON elements with this attribute, e.g.
// <script type="application/json" data-spryker-rich-text-editor-labels>{"signature": "Signatur"}</script>.
export const FEATURE_LABELS_ATTRIBUTE = 'data-spryker-rich-text-editor-labels';

export const DEFAULT_LABELS = {
    toolbar: 'Formatting',
    textStyle: 'Text style',
    normalText: 'Normal text',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    heading4: 'Heading 4',
    heading5: 'Heading 5',
    heading6: 'Heading 6',
    quote: 'Quote',
    codeBlock: 'Code block',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    clearFormatting: 'Remove formatting',
    strikethrough: 'Strikethrough',
    superscript: 'Superscript',
    subscript: 'Subscript',
    fontSize: 'Font size',
    defaultFontSize: 'Default size',
    textColor: 'Text colour',
    backgroundColor: 'Background colour',
    resetColor: 'Reset colour',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    paragraph: 'Paragraph',
    alignLeft: 'Align left',
    alignCenter: 'Align centre',
    alignRight: 'Align right',
    alignJustify: 'Justify',
    outdent: 'Outdent',
    indent: 'Indent',
    image: 'Image',
    link: 'Link',
    video: 'Video',
    table: 'Table',
    insertTable: 'Insert table',
    addRowBefore: 'Add row above',
    addRowAfter: 'Add row below',
    addColumnBefore: 'Add column before',
    addColumnAfter: 'Add column after',
    deleteRow: 'Delete row',
    deleteColumn: 'Delete column',
    mergeCells: 'Merge cells',
    splitCell: 'Split cell',
    headerRow: 'Header row',
    deleteTable: 'Delete table',
    horizontalRule: 'Horizontal rule',
    undo: 'Undo',
    redo: 'Redo',
    source: 'HTML source',
    fullscreen: 'Full screen',
    resizeEditor: 'Resize editor',
    dialogInsert: 'Insert',
    dialogSave: 'Save',
    dialogCancel: 'Cancel',
    dialogClose: 'Close',
    linkDialogTitle: 'Insert link',
    linkUrl: 'URL',
    linkText: 'Text to display',
    linkNewTab: 'Open in new tab',
    linkEdit: 'Edit link',
    linkOpen: 'Open link',
    linkRemove: 'Remove link',
    linkInvalid: 'Enter a valid link address.',
    linkNotAllowed: 'A link cannot be added here, for example inside code.',
    imageDialogTitle: 'Insert image',
    imageEditDialogTitle: 'Edit image',
    imageEdit: 'Edit image',
    imageRemove: 'Remove image',
    imageWidthFull: '100%',
    imageWidthHalf: '50%',
    imageWidthQuarter: '25%',
    imageOriginalSize: 'Original size',
    imageFloatLeft: 'Float left',
    imageFloatRight: 'Float right',
    imageFloatNone: 'Remove float',
    imageUrl: 'Image URL',
    imageAlt: 'Alternative text',
    imageInvalid:
        'Enter an image address starting with https:// or a relative path. Embedded (data:) images are not supported.',
    imageRejected: 'Images can only be added by URL. Pasted or dropped image files are not supported.',
    videoDialogTitle: 'Insert video',
    videoUrl: 'Video URL',
    videoInvalid:
        'Enter the address of a YouTube, Vimeo, Dailymotion, Google Drive, Instagram, Facebook, Youku, QQ or PeerTube video.',
    guardNotice:
        'This content contains %element%, which the visual editor cannot show. It is kept unchanged; edit it as HTML here.',
    guardHtmlComment: 'an HTML comment',
    guardUnsupportedHtml: 'unsupported HTML',
} as const;

export type LabelKey = keyof typeof DEFAULT_LABELS;

export interface Labels {
    get(key: LabelKey): string;
    /** For features: their own keys, with their own English fallback. */
    label(key: string, fallback: string): string;
}

const describeLabelsElement = (element: Element): string =>
    element.id === '' ? `[${FEATURE_LABELS_ATTRIBUTE}]` : `#${element.id}`;

const readLabelsElement = (element: Element): Record<string, unknown> => {
    if (element.textContent?.trim() === '') {
        return {};
    }

    try {
        const overrides: unknown = JSON.parse(element.textContent ?? '');

        if (typeof overrides === 'object' && overrides !== null && !Array.isArray(overrides)) {
            return overrides as Record<string, unknown>;
        }
    } catch (error) {
        console.error(
            `${describeLabelsElement(element)} is not valid JSON; its rich-text editor labels are not used.`,
            error,
        );

        return {};
    }

    console.error(
        `${describeLabelsElement(element)} must contain a JSON object; its rich-text editor labels are not used.`,
    );

    return {};
};

// The project's element (the `rich_text_editor_labels` block) is read last, so it overrides any feature label.
const readOverrides = (document: Document): Record<string, unknown> => {
    const projectElement = document.getElementById(LABELS_ELEMENT_ID);
    const featureElements = Array.from(document.querySelectorAll(`[${FEATURE_LABELS_ATTRIBUTE}]`)).filter(
        (element) => element !== projectElement,
    );

    return Object.assign(
        {},
        ...[...featureElements, ...(projectElement === null ? [] : [projectElement])].map(readLabelsElement),
    ) as Record<string, unknown>;
};

export const loadLabels = (document: Document): Labels => {
    const overrides = readOverrides(document);
    const read = (key: string, fallback: string): string => {
        const value = overrides[key];

        return typeof value === 'string' && value !== '' ? value : fallback;
    };

    return {
        get: (key: LabelKey): string => read(key, DEFAULT_LABELS[key]),
        label: read,
    };
};
