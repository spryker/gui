import { Modal } from 'bootstrap';

export interface DialogField {
    readonly name: string;
    readonly label: string;
    readonly type: 'text' | 'url' | 'checkbox';
    readonly value?: string;
    readonly checked?: boolean;
}

export type DialogValues = Readonly<Record<string, string | boolean>>;

export interface DialogOptions {
    readonly title: string;
    readonly fields: readonly DialogField[];
    readonly submitLabel: string;
    readonly cancelLabel: string;
    readonly closeLabel: string;
    /** An extra footer action, e.g. "Remove link"; it closes the dialog. */
    readonly secondaryAction?: { readonly label: string; run(): void };
    /** Applies the values; returns an error message to keep the dialog open, or null to close it. */
    onSubmit(values: DialogValues): string | null;
    /** Runs after the dialog is hidden, however it was closed; used to give the focus back to the editor. */
    onClose(): void;
}

let dialogCount = 0;

const DIALOG_TEMPLATE_ID = 'rich-text-editor-dialog-template';
const FIELD_TEMPLATE_IDS: Readonly<Record<DialogField['type'], string>> = {
    text: 'rich-text-editor-dialog-text-field-template',
    url: 'rich-text-editor-dialog-text-field-template',
    checkbox: 'rich-text-editor-dialog-checkbox-field-template',
};

// The templates are rendered by @Gui/RichTextEditor/dialog-templates.twig, which Gui's layout.twig includes next to
// the editor script; a page without them cannot show a dialog, so it fails loudly instead of building its own.
const cloneTemplate = (id: string): HTMLElement => {
    const template = document.getElementById(id);
    const element = template instanceof HTMLTemplateElement ? template.content.firstElementChild : null;

    if (!(element instanceof HTMLElement)) {
        throw new Error(`#${id} is missing: include @Gui/RichTextEditor/dialog-templates.twig in the page.`);
    }

    return document.importNode(element, true);
};

const findPart = <T extends HTMLElement>(container: HTMLElement, name: string): T => {
    const part = container.querySelector<T>(`.js-rich-text-editor-dialog__${name}`);

    if (part === null) {
        throw new Error(`The rich-text editor dialog template has no .js-rich-text-editor-dialog__${name} element.`);
    }

    return part;
};

const createFieldRow = (field: DialogField, id: string): HTMLElement => {
    const row = cloneTemplate(FIELD_TEMPLATE_IDS[field.type]);
    const input = findPart<HTMLInputElement>(row, 'input');
    const label = findPart<HTMLLabelElement>(row, 'label');

    input.id = id;
    input.name = field.name;
    input.type = field.type;
    label.htmlFor = id;
    label.textContent = field.label;

    if (field.type === 'checkbox') {
        input.checked = field.checked ?? false;
    } else {
        input.value = field.value ?? '';
    }

    return row;
};

const readValues = (form: HTMLFormElement, fields: readonly DialogField[]): DialogValues =>
    Object.fromEntries(
        fields.map((field) => {
            const input = form.elements.namedItem(field.name) as HTMLInputElement;

            return [field.name, field.type === 'checkbox' ? input.checked : input.value];
        }),
    );

/**
 * A Bootstrap 5 modal with its own <form>, appended to <body>: the editor sits inside the page's form, and
 * forms cannot nest. It is removed from the page once hidden.
 */
export const openDialog = (options: DialogOptions): HTMLElement => {
    const idPrefix = `rich-text-editor-dialog-${(dialogCount += 1)}`;
    const element = cloneTemplate(DIALOG_TEMPLATE_ID);
    const form = findPart<HTMLFormElement>(element, 'form');
    const title = findPart(element, 'title');
    const error = findPart(element, 'error');
    const secondaryButton = findPart<HTMLButtonElement>(element, 'secondary');

    // The fields are validated on submit; the browser's URL check would refuse the relative paths that are allowed.
    form.noValidate = true;
    element.setAttribute('aria-labelledby', `${idPrefix}-title`);
    title.id = `${idPrefix}-title`;
    title.textContent = options.title;
    findPart(element, 'close').setAttribute('aria-label', options.closeLabel);
    findPart(element, 'cancel').textContent = options.cancelLabel;
    findPart(element, 'submit').textContent = options.submitLabel;
    findPart(element, 'fields').append(
        ...options.fields.map((field, index) => createFieldRow(field, `${idPrefix}-field-${index}`)),
    );

    // Bootstrap's Modal looks up .modal-dialog once, in its constructor: the instance is only created once the
    // markup is complete, and handlers fetch that same instance through getOrCreateInstance().
    const getModal = (): Modal => Modal.getOrCreateInstance(element);

    if (options.secondaryAction === undefined) {
        secondaryButton.remove();
    } else {
        const { label, run } = options.secondaryAction;
        secondaryButton.textContent = label;
        secondaryButton.addEventListener('click', () => {
            run();
            getModal().hide();
        });
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = options.onSubmit(readValues(form, options.fields));
        error.textContent = message ?? '';
        error.hidden = message === null;

        if (message === null) {
            getModal().hide();
        }
    });
    element.addEventListener('shown.bs.modal', () => form.querySelector<HTMLInputElement>('input')?.focus());
    element.addEventListener(
        'hidden.bs.modal',
        () => {
            getModal().dispose();
            element.remove();
            options.onClose();
        },
        { once: true },
    );

    document.body.append(element);
    getModal().show();

    return element;
};
