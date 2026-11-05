import type {
    AnyExtension,
    Editor,
    Extension,
    Mark,
    Node,
    mergeAttributes,
    nodePasteRule,
    textblockTypeInputRule,
} from '@tiptap/core';
import type { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { IconShape } from './toolbar/icons';

export type { Labels } from './labels';

export interface ContentCheckResult {
    readonly isValid: boolean;
    /** The first element the editor cannot represent (Tiptap reports one per check), or null. */
    readonly invalidElement: string | null;
}

export interface RichTextEditorHandle {
    readonly textarea: HTMLTextAreaElement;
    getHtml(): string;
    setHtml(html: string, options?: { emitChange?: boolean }): ContentCheckResult;
    insertHtml(html: string): ContentCheckResult;
    isEmpty(): boolean;
    isSourceMode(): boolean;
    setSourceMode(enabled: boolean): Promise<ContentCheckResult>;
    setDisabled(disabled: boolean): void;
    focus(): void;
    syncToTextarea(): void;
    destroy(): void;
}

/** Tiptap runtime values handed to features, so that consumer modules never bundle their own copy. */
export interface TiptapApi {
    readonly Node: typeof Node;
    readonly Mark: typeof Mark;
    readonly Extension: typeof Extension;
    readonly mergeAttributes: typeof mergeAttributes;
    readonly nodePasteRule: typeof nodePasteRule;
    readonly textblockTypeInputRule: typeof textblockTypeInputRule;
    readonly Plugin: typeof Plugin;
    readonly PluginKey: typeof PluginKey;
    readonly NodeSelection: typeof NodeSelection;
}

export interface FeatureContext {
    readonly textarea: HTMLTextAreaElement;
    label(key: string, fallback: string): string;
    showNotice(message: string): void;
}

export interface ToolbarItemDefinition {
    readonly id: string;
    readonly label: string;
    /** Font Awesome 5 class, e.g. `fa fa-bold`. */
    readonly icon?: string;
    /** An SVG icon (24 × 24, `currentColor`), shown instead of `icon`; the built-in items use these. */
    readonly iconShape?: IconShape;
    readonly kind: 'button' | 'toggle' | 'menu';
    readonly menuItems?: readonly ToolbarMenuItem[];
    /** The keyboard shortcut that runs the same command, in ProseMirror notation (e.g. `Mod-b`); shown in the tooltip. */
    readonly shortcut?: string;
    run(editor: Editor, value?: string): void;
    isActive?(editor: Editor): boolean;
    /** Whether the command can run in the current state (e.g. undo with history); default: always. */
    isEnabled?(editor: Editor): boolean;
    /**
     * Menus only: the `value` of the entry that matches the selection, shown as checked, or null for none. Makes
     * the entries a choice of values (radio entries); without it they are commands.
     */
    activeValue?(editor: Editor): string | null;
}

export interface ToolbarMenuItem {
    readonly value: string;
    readonly label: string;
    /** A CSS colour shown as a swatch before the label, e.g. for colour palettes. */
    readonly swatch?: string;
    /** A command in a menu of values (e.g. Indent next to the alignments); it is never shown as checked. */
    readonly isAction?: boolean;
    /** Whether the entry can run in the current state; read when the menu opens. Default: always. */
    isEnabled?(editor: Editor): boolean;
}

export interface NodeMenuDefinition {
    readonly nodeName: string;
    /** The accessible name of the menu; default: the node name. */
    readonly label?: string;
    readonly items: readonly ToolbarItemDefinition[];
    /**
     * Whether the menu shows for the editor state; default: while `nodeName` is active. A menu never shows for a
     * read-only field or in source mode.
     */
    isShown?(editor: Editor): boolean;
    /** Text shown before the buttons while the menu shows, e.g. the address of a link. */
    caption?(editor: Editor): string;
    /** Whether the buttons show their label next to the icon; default true. The label is always the tooltip. */
    readonly showLabels?: boolean;
}

export interface RichTextEditorFeature {
    readonly name: string;
    /** Position in the module-buttons toolbar group; default 100. */
    readonly order?: number;
    extensions?(tiptap: TiptapApi, context: FeatureContext): readonly AnyExtension[];
    toolbarItems?(context: FeatureContext): readonly ToolbarItemDefinition[];
    nodeMenus?(context: FeatureContext): readonly NodeMenuDefinition[];
}

export interface VideoEmbed {
    readonly src: string;
    readonly width: number;
    readonly height: number;
}

export interface VideoProvider {
    readonly name: string;
    /** Extra iframe attributes, e.g. `allowfullscreen` or `scrolling`. */
    readonly attributes?: Readonly<Record<string, string>>;
    toEmbed(pageUrl: string): VideoEmbed | null;
    matchesEmbedSrc(src: string): boolean;
}

/** The `data-spryker-rich-text-editor` JSON written by `RichTextEditorType` (Gui). */
export interface RichTextEditorFieldConfig {
    /** The feature profile, the type's `editor_config` option (e.g. `cms`). */
    readonly editorConfig?: string;
    /** Built-in toolbar item ids to show, the type's `toolbar` option; all items when absent. */
    readonly toolbar?: readonly string[];
}

export interface EditorMountContext {
    readonly configName: string | undefined;
    readonly toolbar: readonly string[] | undefined;
    readonly features: readonly RichTextEditorFeature[];
    readonly videoProviders: readonly VideoProvider[];
    /** Called by the handle's destroy(), so the registry releases the field. */
    onDestroy(): void;
}

export interface RichTextEditorModule {
    createRichTextEditor(textarea: HTMLTextAreaElement, context: EditorMountContext): RichTextEditorHandle;
}

export interface SprykerRichTextEditorRegistry {
    readonly apiVersion: 1;
    /** `configName` is the field's `editor_config` option (`RichTextEditorType`); `'*'` registers for every field. */
    registerFeature(configName: string, feature: RichTextEditorFeature): void;
    /** A provider with an existing name replaces it in place; a new name is appended. */
    registerVideoProvider(provider: VideoProvider): void;
    /** Whether the editor owns the field (loading, ready or failed); a claimed field must not be given to Summernote. */
    isClaimed(textarea: HTMLTextAreaElement): boolean;
    getEditor(textarea: HTMLTextAreaElement): RichTextEditorHandle | null;
    whenReady(textarea: HTMLTextAreaElement): Promise<RichTextEditorHandle | null>;
    /** The field's HTML, or null when the field is not claimed and the caller keeps its legacy path. */
    readHtml(textarea: HTMLTextAreaElement): string | null;
    /** False when the field is not claimed and the caller keeps its legacy path. */
    writeHtml(textarea: HTMLTextAreaElement, html: string): boolean;
    /** @internal Called by Gui init.js only. */
    mount(textarea: HTMLTextAreaElement, fieldConfig: RichTextEditorFieldConfig): void;
}

declare global {
    interface Window {
        SprykerRichTextEditor?: SprykerRichTextEditorRegistry;
    }
}
