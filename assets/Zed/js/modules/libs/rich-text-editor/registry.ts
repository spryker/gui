import { RICH_TEXT_EDITOR_EVENT_READY, dispatchRichTextEditorEvent as dispatch } from './events';
import type {
    RichTextEditorFeature,
    RichTextEditorFieldConfig,
    RichTextEditorHandle,
    RichTextEditorModule,
    SprykerRichTextEditorRegistry,
    VideoProvider,
} from './types';

export { RICH_TEXT_EDITOR_EVENT_CHANGE, RICH_TEXT_EDITOR_EVENT_READY } from './events';

const ALL_FIELDS = '*';
const DEFAULT_CONFIG_NAME = 'default';

export interface RichTextEditorRegistryDependencies {
    loadEditorModule(): Promise<RichTextEditorModule>;
}

interface ClaimedField {
    status: 'loading' | 'ready' | 'failed';
    handle: RichTextEditorHandle | null;
    ready: Promise<RichTextEditorHandle | null>;
}

export const createRichTextEditorRegistry = (
    dependencies: RichTextEditorRegistryDependencies,
): SprykerRichTextEditorRegistry => {
    const featuresByConfigName = new Map<string, RichTextEditorFeature[]>();
    const videoProviders: VideoProvider[] = [];
    const claimedFields = new WeakMap<HTMLTextAreaElement, ClaimedField>();
    let editorModule: Promise<RichTextEditorModule> | null = null;
    let hasMounted = false;

    const loadEditorModule = (): Promise<RichTextEditorModule> => {
        editorModule ??= dependencies.loadEditorModule();

        return editorModule;
    };

    const getFeatures = (configName: string | undefined): RichTextEditorFeature[] => [
        ...(featuresByConfigName.get(ALL_FIELDS) ?? []),
        ...(configName === undefined || configName === ALL_FIELDS ? [] : (featuresByConfigName.get(configName) ?? [])),
    ];

    const claim = (
        textarea: HTMLTextAreaElement,
        configName: string | undefined,
        toolbar: readonly string[] | undefined,
    ) => {
        const field: ClaimedField = { status: 'loading', handle: null, ready: Promise.resolve(null) };
        const fail = (message: string, error: unknown): null => {
            field.status = 'failed';
            console.error(message, error);

            return null;
        };
        // A failed load or creation leaves the textarea usable: creation rolls back what it built.
        field.ready = loadEditorModule().then(
            (module) => {
                try {
                    const handle = module.createRichTextEditor(textarea, {
                        configName,
                        toolbar,
                        features: getFeatures(configName),
                        videoProviders: [...videoProviders],
                        onDestroy: () => claimedFields.delete(textarea),
                    });
                    field.status = 'ready';
                    field.handle = handle;
                    dispatch(textarea, RICH_TEXT_EDITOR_EVENT_READY, { handle });

                    return handle;
                } catch (error) {
                    return fail(
                        `Failed to create the rich-text editor for editor config "${configName ?? DEFAULT_CONFIG_NAME}"; the ` +
                            'field stays a plain textarea. A registered feature may have thrown.',
                        error,
                    );
                }
            },
            (error: unknown) =>
                fail(
                    'Failed to load the rich-text editor; the field stays a plain textarea. This is usually a ' +
                        'stale or missing file under public/Backoffice/assets/js/chunks — rebuild the Back Office ' +
                        'assets with "npm run zed" and reload.',
                    error,
                ),
        );
        claimedFields.set(textarea, field);
    };

    return {
        apiVersion: 1,

        registerFeature(configName: string, feature: RichTextEditorFeature): void {
            if (hasMounted) {
                console.warn(
                    `[SprykerRichTextEditor] Feature "${feature.name}" was registered after an editor mounted; it ` +
                        `only applies to fields mounted later. Register features before spryker-zed-gui-init.js runs.`,
                );
            }

            featuresByConfigName.set(configName, [...(featuresByConfigName.get(configName) ?? []), feature]);
        },

        registerVideoProvider(provider: VideoProvider): void {
            const index = videoProviders.findIndex((registered) => registered.name === provider.name);

            if (index === -1) {
                videoProviders.push(provider);

                return;
            }

            videoProviders[index] = provider;
        },

        isClaimed: (textarea: HTMLTextAreaElement): boolean => claimedFields.has(textarea),

        getEditor(textarea: HTMLTextAreaElement): RichTextEditorHandle | null {
            const field = claimedFields.get(textarea);

            return field?.status === 'ready' ? field.handle : null;
        },

        whenReady: (textarea: HTMLTextAreaElement): Promise<RichTextEditorHandle | null> =>
            claimedFields.get(textarea)?.ready ?? Promise.resolve(null),

        readHtml(textarea: HTMLTextAreaElement): string | null {
            const field = claimedFields.get(textarea);

            if (field === undefined) {
                return null;
            }

            return field.handle?.getHtml() ?? textarea.value;
        },

        writeHtml(textarea: HTMLTextAreaElement, html: string): boolean {
            const field = claimedFields.get(textarea);

            if (field === undefined) {
                return false;
            }

            if (field.handle === null) {
                // Loading or failed: the editor reads the textarea when it is created.
                textarea.value = html;

                return true;
            }

            field.handle.setHtml(html);

            return true;
        },

        mount(textarea: HTMLTextAreaElement, fieldConfig: RichTextEditorFieldConfig): void {
            if (claimedFields.has(textarea)) {
                return;
            }

            hasMounted = true;
            claim(textarea, fieldConfig.editorConfig, fieldConfig.toolbar);
        },
    };
};

export const installRichTextEditorRegistry = (
    target: Window,
    loadEditorModule: () => Promise<RichTextEditorModule>,
): void => {
    // A project script may have installed its own registry first; that one wins.
    target.SprykerRichTextEditor ??= createRichTextEditorRegistry({ loadEditorModule });
};
