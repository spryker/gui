import type { AnyExtension } from '@tiptap/core';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { BackgroundColor, FontSize } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { HtmlBlockContainer, HtmlInlineContainer } from '../extensions/html-container';
import { createHtmlInlineMarks } from '../extensions/html-inline';
import { createImageUrlOnly } from '../extensions/image-url-only';
import { Indent } from '../extensions/indent';
import { LegacyFontColor, LegacyFontTextStyle } from '../extensions/legacy-font';
import { LegacyMarkup } from '../extensions/legacy-markup';
import { createVideoEmbed } from '../extensions/video-embed';
import type { VideoProvider } from '../types';
import { BUILT_IN_VIDEO_PROVIDERS } from '../video-providers/built-in-providers';

// Summernote's tableClassName default (summernote-bs5.js).
const TABLE_CLASS_NAME = 'table table-bordered';

export interface DefaultExtensionsOptions {
    /** Called when a pasted, dropped or embedded (data:) image is refused. */
    onImageRejected?(): void;
    /** The providers a video can be embedded from; default: the built-in ones. */
    videoProviders?: readonly VideoProvider[];
    /** Shown in an empty editor (the field's `placeholder`); a decoration, never part of the HTML. */
    placeholder?: string;
}

/**
 * The extensions behind the toolbar: Summernote's items (ZedGuiEditorConfiguration.getConfig()) plus the Text style
 * menu, which edits StarterKit's headings, blockquotes and code blocks; these also keep content created in
 * Summernote's code view loading instead of tripping the content check.
 */
export const createDefaultExtensions = (options: DefaultExtensionsOptions = {}): AnyExtension[] => [
    StarterKit.configure({
        // Link defaults target/rel to "_blank"/"noopener noreferrer nofollow", which would be added to every stored
        // link on its next save; Summernote only wrote a target when "open in new window" was chosen.
        link: { openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null } },
        // It appends an empty paragraph to content ending in a list, table or rule, changing stored content on
        // its first save; the gap cursor already lets the user continue after such a block.
        trailingNode: false,
    }),
    LegacyFontTextStyle,
    LegacyFontColor,
    BackgroundColor,
    FontSize,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Superscript,
    Subscript,
    TableKit.configure({ table: { HTMLAttributes: { class: TABLE_CLASS_NAME }, resizable: false } }),
    createImageUrlOnly(() => options.onImageRejected?.()),
    createVideoEmbed(options.videoProviders ?? BUILT_IN_VIDEO_PROVIDERS),
    HtmlBlockContainer,
    HtmlInlineContainer,
    ...createHtmlInlineMarks(),
    LegacyMarkup,
    Indent,
    ...(options.placeholder ? [Placeholder.configure({ placeholder: options.placeholder })] : []),
];
