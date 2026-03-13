'use strict';

function getLocale() {
    var locale = document.documentElement.dataset.applicationLocale;
    if (typeof locale === 'string') {
        return locale.split('_')[0].split('-')[0];
    }
    return 'en';
}

function getTranslation(locale) {
    try {
        return require('./i18n/' + locale + '.json');
    } catch (e) {
        return require('./i18n/en.json');
    }
}

var locale = getLocale();

var translationObj = getTranslation(locale);

translationObj.sEmptyTable = `<div class="dataTables_empty-message">
                <strong>${translationObj.sEmptyTableTitle}</strong>
                <span>${translationObj.sEmptyTableText}</span>
            </div>`;

var defaultConfiguration = {
    responsive: true,
    columnDefs: [
        { responsivePriority: 1, targets: 0 }, // First column, highest priority
        { responsivePriority: 2, targets: -1 }, // Last column, second highest priority
    ],
    language: translationObj,
};

var noSearchConfiguration = {
    responsive: true,
    columnDefs: [
        { responsivePriority: 1, targets: 0 }, // First column, highest priority
        { responsivePriority: 2, targets: -1 }, // Last column, second highest priority
    ],
    bFilter: false,
    bInfo: false,
};

function setTableErrorMode(errorMode) {
    $.fn.dataTable.ext.errMode = errorMode || 'none';
}

function onTabChange(tabId) {
    var $tab = $(tabId);
    var $dataTables = $tab.find('.gui-table-data, .gui-table-data-no-search');

    if (!$dataTables.data('initialized')) {
        $dataTables.data('initialized', true).DataTable().draw();
    }

    $dataTables.DataTable().columns.adjust();
}

function onError(e, settings, techNote, message) {
    var debugMessage = '';

    if (DEV) {
        debugMessage = '<br/><br/><small><u>Debug message:</u><br/> ' + message + '</small>';
    }

    window.sweetAlert({
        title: 'Error',
        text:
            'Something went wrong. Please <a href="javascript:window.location.reload()">refresh</a> the page or try again later.' +
            debugMessage,
        html: true,
        type: 'error',
    });
}

module.exports = {
    defaultConfiguration: defaultConfiguration,
    noSearchConfiguration: noSearchConfiguration,
    setTableErrorMode: setTableErrorMode,
    onTabChange: onTabChange,
    onError: onError,
};
