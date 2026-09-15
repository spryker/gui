/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

'use strict';

var editorConfig = require('ZedGuiEditorConfiguration');
var Tabs = require('./libs/tabs');
var TranslationCopyFields = require('./libs/translation-copy-fields');
var Ibox = require('./libs/ibox');
var safeChecks = require('./libs/safe-checks');
var initFormattedNumber = require('./libs/formatted-number-input');
var initFormattedMoney = require('./libs/formatted-money-input');
var select2combobox = require('./libs/select2-combobox');
var bootstrap = require('bootstrap');
import { Dropzone } from './libs/dropzone';
import { FormSubmitter } from './libs/form-submitter';
import { DatePicker } from './libs/datepicker';
import { ImageUploader } from './libs/image-uploader';
import { Highlight } from './libs/highlight';
import { DownloadAction } from './libs/download-action';
import { CopyAction } from './libs/copy-action';
import { Table } from './libs/table/table';
import FormWithExternalFields from './form-with-external-fields';
import InternalMenuFilter from './libs/internal-api/internal-menu-filter';
import initSweetAlertMapper from './libs/sweet-alert-mapper';

var editorInit = function () {
    $('.html-editor').each(function () {
        var $textarea = $(this);
        var textareaConfigName = $textarea.data('editor-config');

        var config = editorConfig.getGlobalConfig(textareaConfigName);

        if (!config) {
            config = editorConfig.getConfig();
        }

        $textarea.summernote(config);
    });

    $.fn.modal = function (config) {
        return this.each(() => {
            const modal = bootstrap.Modal.getOrCreateInstance(this[0]);
            if (config === 'show') modal.show();
            else if (config === 'hide') modal.hide();
        });
    };
};

var tooltipInit = function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));
};

var tooltipInit = function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));
};

$(document).ready(function () {
    // editor
    editorInit();
    tooltipInit();

    $('.spryker-form-autocomplete').each(function (key, value) {
        var autoCompletedField = $(value);
        if (autoCompletedField.data('url') === 'undefined') {
            return;
        }

        if (autoCompletedField.hasClass('ui-autocomplete')) {
            autoCompletedField.autocomplete('destroy');
        }

        autoCompletedField.autocomplete({
            source: autoCompletedField.data('url'),
            minLength: 3,
        });
    });

    $('.more-history').click(function (e) {
        e.preventDefault();
        var idProductItem = $(this).data('id');
        var $history = $('#history_details_' + idProductItem);
        var $button = $('#history-btn-' + idProductItem);
        var isHidden = $history.hasClass('hidden');

        $history.toggleClass('hidden', !isHidden);
        $button.toggleClass('is-hidden', !isHidden);
        $button.toggleClass('is-shown', isHidden);
    });

    /* Init Select2 combobox */
    select2combobox();

    /* Init tabs */
    $('.tabs-container').each(function (index, item) {
        item.tabsInstance = new Tabs(item);
    });

    safeChecks.addSafeSubmitCheck();
    safeChecks.addSafeDatetimeCheck();

    initFormattedNumber();
    initFormattedMoney();
    initSweetAlertMapper();

    new TranslationCopyFields();
    new Ibox();
    new DatePicker();
    new Dropzone();
    new FormSubmitter();
    new ImageUploader();
    new FormWithExternalFields();
    new Highlight();
    new CopyAction();
    new DownloadAction();
    new Table();
    new InternalMenuFilter();
});
