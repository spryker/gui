import { ResizableNodeView, getRenderedAttributes, mergeAttributes } from '@tiptap/core';
import type { Editor, NodeViewRendererProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

const MIN_SIZE_PX = 24;
const FILL_CONTAINER = '100%';
const HANDLE_SELECTOR = '[data-resize-handle]';
// Owned by the view, not the node: the size and style by layoutImage(), `draggable="false"` by ResizableNodeView.
const VIEW_ATTRIBUTES = new Set(['width', 'height', 'style', 'draggable']);

const toPixels = (value: unknown): string =>
    value === null || value === undefined || value === '' ? '' : `${String(value)}px`;

// Width and float go on the node view's container: the image is an inline node, so a float on the <img> inside
// the container would not float it, and a percentage would resolve against the shrink-to-fit container.
const layoutImage = (container: HTMLElement, image: HTMLImageElement, node: ProseMirrorNode): void => {
    const width = (node.attrs.styleWidth as string | null) ?? toPixels(node.attrs.width);

    container.style.width = width;
    container.style.cssFloat = (node.attrs.float as string | null) ?? '';
    image.style.width = width === '' ? '' : FILL_CONTAINER;
    image.style.height = (node.attrs.styleHeight as string | null) ?? toPixels(node.attrs.height);
};

const writeAttributes = (image: HTMLImageElement, attributes: Record<string, unknown>): void => {
    for (const name of image.getAttributeNames()) {
        if (!VIEW_ATTRIBUTES.has(name) && !(name in attributes)) {
            image.removeAttribute(name);
        }
    }

    for (const [name, value] of Object.entries(attributes)) {
        if (VIEW_ATTRIBUTES.has(name)) {
            continue;
        }

        if (value === null || value === undefined) {
            image.removeAttribute(name);
        } else {
            image.setAttribute(name, String(value));
        }
    }
};

const renderAttributes = (
    editor: Editor,
    node: ProseMirrorNode,
    htmlAttributes: Record<string, unknown>,
): Record<string, unknown> =>
    mergeAttributes(
        htmlAttributes,
        getRenderedAttributes(
            node,
            editor.extensionManager.attributes.filter((attribute) => attribute.type === node.type.name),
        ),
    );

/**
 * An image with drag handles (Tiptap's ResizableNodeView, aspect ratio kept); a drag stores the width in pixels
 * through setImageWidth(). Two gaps of ResizableNodeView 3.31 are closed here: it commits on every mouse-up, also
 * after a click without a drag, which would turn a percentage into pixels; and it never ends a touch drag (no
 * touchend listener), so a later tap would commit a stray width. A commit needs a drag, and touch on the handles
 * is ignored: the image menu's size buttons cover touch and the keyboard.
 */
export const createImageView = (
    { node, getPos, editor }: NodeViewRendererProps,
    htmlAttributes: Record<string, unknown>,
): ResizableNodeView => {
    const image = document.createElement('img');
    let currentNode = node;
    let hasResized = false;
    writeAttributes(image, renderAttributes(editor, node, htmlAttributes));

    const view: ResizableNodeView = new ResizableNodeView({
        element: image,
        node,
        editor,
        getPos,
        onResize: (width: number) => {
            hasResized = true;
            view.dom.style.width = `${width}px`;
        },
        onCommit: (width: number) => {
            const position = getPos();

            if (!hasResized || position === undefined) {
                return;
            }

            hasResized = false;

            if (
                !editor
                    .chain()
                    .setNodeSelection(position)
                    .setImageWidth(`${Math.round(width)}px`)
                    .run()
            ) {
                layoutImage(view.dom, image, currentNode);
                console.error('The rich-text editor could not store the dragged image width.');
            }
        },
        onUpdate: (updatedNode: ProseMirrorNode) => {
            currentNode = updatedNode;
            writeAttributes(image, renderAttributes(editor, updatedNode, htmlAttributes));
            layoutImage(view.dom, image, updatedNode);

            return true;
        },
        options: {
            min: { width: MIN_SIZE_PX, height: MIN_SIZE_PX },
            preserveAspectRatio: true,
            className: {
                container: 'rich-text-editor__image',
                handle: 'rich-text-editor__image-handle',
                resizing: 'rich-text-editor__image--resizing',
            },
        },
    });
    // Capture on the container: runs before the handles' own listener, also for handles attached again later.
    view.dom.addEventListener(
        'touchstart',
        (event) => {
            if (event.target instanceof Element && event.target.closest(HANDLE_SELECTOR) !== null) {
                event.stopPropagation();
            }
        },
        { capture: true },
    );
    layoutImage(view.dom, image, node);

    return view;
};
