import type { RichTextEditorFieldConfig, SprykerRichTextEditorRegistry } from './types';

/** The attribute `RichTextEditorType` (Gui) writes its JSON configuration into. */
export const RICH_TEXT_EDITOR_ATTRIBUTE = 'data-spryker-rich-text-editor';

const readFieldConfig = (textarea: HTMLTextAreaElement): RichTextEditorFieldConfig => {
    const json = textarea.getAttribute(RICH_TEXT_EDITOR_ATTRIBUTE) ?? '';

    try {
        const config: unknown = JSON.parse(json);

        if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
            return config as RichTextEditorFieldConfig;
        }
    } catch (error) {
        console.error(`Invalid ${RICH_TEXT_EDITOR_ATTRIBUTE} JSON; the field uses the default editor.`, error);

        return {};
    }

    console.error(`${RICH_TEXT_EDITOR_ATTRIBUTE} is not a JSON object; the field uses the default editor.`, json);

    return {};
};

/**
 * Mounts the rich-text editor on every `RichTextEditorType` field under `root`. Without a registry the
 * fields stay plain textareas, which still submit their HTML.
 */
export const initRichTextEditorFields = (
    root: ParentNode,
    registry: SprykerRichTextEditorRegistry | undefined,
): void => {
    const textareas = root.querySelectorAll<HTMLTextAreaElement>(`textarea[${RICH_TEXT_EDITOR_ATTRIBUTE}]`);

    if (textareas.length === 0) {
        return;
    }

    if (registry === undefined) {
        console.error(
            'spryker-zed-gui-rich-text-editor.js is not on the page, so the rich-text fields stay plain textareas. ' +
                'Does a layout override replace the common_js block without parent()?',
        );

        return;
    }

    textareas.forEach((textarea) => registry.mount(textarea, readFieldConfig(textarea)));
};
