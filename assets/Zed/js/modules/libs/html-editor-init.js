/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

'use strict';

var DEPRECATION_MESSAGE =
    '[Spryker Gui] Summernote fields (textarea.html-editor) are deprecated and will be removed in the next major ' +
    'version. Use RichTextEditorType for the field and port custom Summernote buttons to a RichTextEditorFeature.';

/**
 * Starts Summernote on every `textarea.html-editor`.
 *
 * @deprecated Use `RichTextEditorType` (Gui); its fields are mounted by `initRichTextEditorFields()`. Will be removed
 *   in the next major version together with Summernote.
 *
 * @param {JQueryStatic} jQuery
 * @param {{ getGlobalConfig: function(string): (object|null), getConfig: function(): object }} editorConfiguration
 *
 * @returns {void}
 */
export function initHtmlEditors(jQuery, editorConfiguration) {
    var $fields = jQuery('.html-editor');

    if ($fields.length > 0) {
        console.warn(DEPRECATION_MESSAGE);
    }

    $fields.each(function () {
        var $textarea = jQuery(this);
        var textareaConfigName = $textarea.data('editor-config');

        var config = editorConfiguration.getGlobalConfig(textareaConfigName);

        if (!config) {
            config = editorConfiguration.getConfig();
        }

        $textarea.summernote(config);
    });
}
