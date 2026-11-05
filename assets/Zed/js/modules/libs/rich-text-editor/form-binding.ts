export interface FormBindingCallbacks {
    /** Runs in the capture phase of the form's submit, before any other submit handler reads the field. */
    onSubmit(): void;
    onLabelClick(): void;
    onSourceInput(): void;
}

export interface FormBinding {
    /** The id of the field's label, given one when it had none; null when the field has no label. */
    readonly labelId: string | null;
    destroy(): void;
}

const resolveLabelId = (textarea: HTMLTextAreaElement, label: HTMLLabelElement | null): string | null => {
    if (label === null) {
        return null;
    }

    label.id ||= `${textarea.id || textarea.name.replace(/\W+/g, '-')}-label`;

    return label.id;
};

export const bindForm = (textarea: HTMLTextAreaElement, callbacks: FormBindingCallbacks): FormBinding => {
    const form = textarea.form;
    const label = textarea.labels?.[0] ?? null;
    const onSubmit = (): void => callbacks.onSubmit();
    const onLabelClick = (event: Event): void => {
        // A click on the label of a hidden textarea does nothing; the editable area takes the focus instead.
        event.preventDefault();
        callbacks.onLabelClick();
    };
    const onInput = (): void => callbacks.onSourceInput();

    form?.addEventListener('submit', onSubmit, true);
    label?.addEventListener('click', onLabelClick);
    textarea.addEventListener('input', onInput);

    return {
        labelId: resolveLabelId(textarea, label),
        destroy(): void {
            form?.removeEventListener('submit', onSubmit, true);
            label?.removeEventListener('click', onLabelClick);
            textarea.removeEventListener('input', onInput);
        },
    };
};

const EDITABLE_CLASS_NAME = 'rich-text-editor__editable';
const COPIED_ARIA_ATTRIBUTES = ['aria-invalid', 'aria-describedby', 'aria-required'];
const EDITABLE_AREA_DATA_QA_ATTRIBUTE = 'wysiwyg-content';

/** The editable area is the field's multi-line textbox: it takes over the label and the validation state. */
export const createEditableAttributes = (
    textarea: HTMLTextAreaElement,
    labelId: string | null,
): Record<string, string> => {
    const attributes: Record<string, string> = {
        class: EDITABLE_CLASS_NAME,
        role: 'textbox',
        'aria-multiline': 'true',
    };

    for (const name of COPIED_ARIA_ATTRIBUTES) {
        const value = textarea.getAttribute(name);

        if (value !== null) {
            attributes[name] = value;
        }
    }

    if (textarea.placeholder !== '') {
        attributes['aria-placeholder'] = textarea.placeholder;
    }

    attributes['data-qa'] = EDITABLE_AREA_DATA_QA_ATTRIBUTE;

    if (labelId !== null) {
        attributes['aria-labelledby'] = labelId;
    }

    return attributes;
};
