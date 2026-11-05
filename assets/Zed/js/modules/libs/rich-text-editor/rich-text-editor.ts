import { createEditorDom } from './dom';
import { RichTextEditorController } from './editor-handle';
import { RICH_TEXT_EDITOR_EVENT_MODE_CHANGE } from './events';
import { createFullscreen } from './fullscreen';
import { loadLabels } from './labels';
import { createNodeMenus } from './node-menu';
import { createDefaultExtensions } from './presets/default-extensions';
import { createResizeHandle } from './resize-handle';
import { createBlockGroup } from './toolbar/block-items';
import { createContextMenus, createLinkDialogShortcut } from './toolbar/context-menus';
import { createFormatGroups } from './toolbar/format-items';
import { FULLSCREEN_ITEM_ID, LINK_ITEM_ID, SOURCE_ITEM_ID, createInsertGroups } from './toolbar/insert-items';
import { renderToolbar } from './toolbar/toolbar';
import type { ToolbarGroup } from './toolbar/toolbar';
import { tiptapApi } from './tiptap-api';
import type { FeatureContext, RichTextEditorFeature, RichTextEditorModule } from './types';
import { resolveVideoProviders } from './video-providers/built-in-providers';
import './rich-text-editor.scss';

const DEFAULT_FEATURE_ORDER = 100;

const createFeatureGroup = (features: readonly RichTextEditorFeature[], context: FeatureContext): ToolbarGroup => ({
    name: 'custom',
    items: [...features]
        .sort((first, second) => (first.order ?? DEFAULT_FEATURE_ORDER) - (second.order ?? DEFAULT_FEATURE_ORDER))
        .flatMap((feature) => feature.toolbarItems?.(context) ?? []),
});

// The type's `toolbar` option limits the built-in items only; feature items always show.
const filterBuiltInGroups = (
    groups: readonly ToolbarGroup[],
    toolbar: readonly string[] | undefined,
): ToolbarGroup[] =>
    toolbar === undefined
        ? [...groups]
        : groups.map((group) => ({ ...group, items: group.items.filter((item) => toolbar.includes(item.id)) }));

export const createRichTextEditor: RichTextEditorModule['createRichTextEditor'] = (textarea, context) => {
    const labels = loadLabels(document);
    const dom = createEditorDom(textarea);
    let controller: RichTextEditorController | null = null;
    // A rollback of a failed creation is not a destroy: the field stays claimed, as a plain textarea.
    let isCreated = false;

    try {
        const featureContext: FeatureContext = {
            textarea,
            label: labels.label,
            showNotice: (message: string) => dom.showNotice(message, true),
        };
        const hasBuiltInItem = (itemId: string): boolean =>
            context.toolbar === undefined || context.toolbar.includes(itemId);
        const nodeMenus = createNodeMenus(
            [
                ...createContextMenus(labels, hasBuiltInItem),
                ...context.features.flatMap((feature) => feature.nodeMenus?.(featureContext) ?? []),
            ],
            { isVisualMode: () => controller?.isSourceMode() === false },
        );
        const extensions = [
            ...createDefaultExtensions({
                onImageRejected: () => dom.showNotice(labels.get('imageRejected'), true),
                videoProviders: resolveVideoProviders(context.videoProviders),
                placeholder: textarea.placeholder,
            }),
            ...context.features.flatMap((feature) => feature.extensions?.(tiptapApi, featureContext) ?? []),
            ...nodeMenus.flatMap((menu) => menu.extensions),
            ...(hasBuiltInItem(LINK_ITEM_ID) ? [createLinkDialogShortcut(labels)] : []),
        ];
        const createdController = new RichTextEditorController(textarea, dom, extensions, {
            labels,
            loadSourceView: () => import(/* webpackChunkName: "rich-text-editor-source" */ './source-view'),
            onDestroy: () => {
                if (isCreated) {
                    context.onDestroy();
                }
            },
        });
        controller = createdController;
        dom.root.append(createResizeHandle(dom.content, labels.get('resizeEditor')));
        const fullscreen = createFullscreen(dom, () => {
            toolbar.refresh();
            nodeMenus.forEach((menu) => menu.updatePosition(createdController.getTiptapEditor()));
        });
        createdController.registerCleanup(() => fullscreen.destroy());
        const toolbar = renderToolbar(
            dom.toolbar,
            createdController.getTiptapEditor(),
            [
                ...filterBuiltInGroups(
                    [
                        createBlockGroup(labels),
                        ...createFormatGroups(labels),
                        ...createInsertGroups(labels, createdController, fullscreen),
                    ],
                    context.toolbar,
                ),
                createFeatureGroup(context.features, featureContext),
            ],
            {
                ariaLabel: labels.get('toolbar'),
                sourceModeItemIds: [SOURCE_ITEM_ID, FULLSCREEN_ITEM_ID],
                isSourceMode: () => createdController.isSourceMode(),
            },
        );

        const onModeChange = (event: Event): void => {
            toolbar.refresh();
            fullscreen.refresh();

            // A switch made by code (the content guard) does not blur the editor, which would hide a shown menu.
            if ((event as CustomEvent<{ isSourceMode: boolean }>).detail.isSourceMode) {
                nodeMenus.forEach((menu) => menu.hide(createdController.getTiptapEditor()));
            }
        };

        textarea.addEventListener(RICH_TEXT_EDITOR_EVENT_MODE_CHANGE, onModeChange);
        createdController.registerCleanup(() => {
            textarea.removeEventListener(RICH_TEXT_EDITOR_EVENT_MODE_CHANGE, onModeChange);
            toolbar.destroy();
        });
        isCreated = true;

        return createdController;
    } catch (error) {
        // Restores the textarea with its value and removes the form listener, so nothing overwrites later writes.
        if (controller === null) {
            dom.root.remove();
        } else {
            controller.destroy();
        }

        throw error;
    }
};
