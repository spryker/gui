import { installRichTextEditorRegistry } from './modules/libs/rich-text-editor/registry';

// Loaded by layout.twig on every Back Office page. The editor itself is an async chunk, fetched the first time a
// RichTextEditorType field mounts.
installRichTextEditorRegistry(
    window,
    () => import(/* webpackChunkName: "rich-text-editor" */ './modules/libs/rich-text-editor/rich-text-editor'),
);
