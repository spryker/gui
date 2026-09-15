import { SelectableTable } from './selectable-table';
import { FilterableTable } from './filterable-table';
import { TableFileUploader } from './table-file-uploader';
import { MasterDetailTable } from './master-detail-table';
import { AssignableTable } from './assignable-table';
import { PerformanceTable } from './performance-table';
import { SearchableTable } from './searchable-table';
import { TableHandle } from './table-handle';
import { TABLE_REQUEST_EVENT } from './table-access';

const dataTable = require('../data-table');

export const TABLE_INIT_EVENT = 'TABLE-INIT-EVENT';

function getTranslations() {
    const localeEl = document.documentElement.dataset.applicationLocale;
    const locale = typeof localeEl === 'string' ? localeEl.split('_')[0].split('-')[0] : 'en';
    let obj;

    try {
        obj = require('../i18n/' + locale + '.json');
    } catch {
        obj = require('../i18n/en.json');
    }

    return obj;
}

/**
 * The stock callback answers a corrupt entry with `{}`, a truthy state object which DataTables then
 * implements as if it were real. Answering with `null` instead lets the table fall back to its
 * configured defaults. An out-of-range `start` is left to be corrected once the row count is known -
 * a server-side table has none at the moment its state is loaded.
 *
 * @param {Object} settings - DataTables settings object of the table.
 *
 * @returns {Object|null} Saved state of the table, or null when there is none to restore.
 */
function loadState(settings) {
    try {
        const storage = settings.iStateDuration === -1 ? sessionStorage : localStorage;
        const state = JSON.parse(storage.getItem(`DataTables_${settings.sInstance}_${location.pathname}`));

        if (!state) {
            return null;
        }

        if (!Number.isInteger(state.start) || state.start < 0) {
            state.start = 0;
        }

        return state;
    } catch {
        return null;
    }
}

export class Table {
    static FEATURES = {
        selectable: {
            class: SelectableTable,
            attribute: 'data-selectable',
        },
        filterable: {
            class: FilterableTable,
            attribute: 'data-filterable',
        },
        uploader: {
            attribute: 'data-uploader',
            class: TableFileUploader,
        },
        masterDetail: {
            attribute: 'data-master-detail',
            class: MasterDetailTable,
        },
        assignable: {
            attribute: 'data-assignable',
            class: AssignableTable,
        },
        performance: {
            class: PerformanceTable,
        },
        searchable: {
            class: SearchableTable,
        },
    };

    static #defaultOptions = {
        selectors: '.gui-table-data[id],.gui-table-data-no-search[id]',
        config: {
            debounce: null,
        },
        configuration: {
            default: {
                responsive: true,
                language: getTranslations(),
                columnDefs: [
                    { responsivePriority: 1, targets: 0 },
                    { responsivePriority: 2, targets: -1 },
                ],
                stateLoadCallback: loadState,
            },
            noSearch: {
                responsive: true,
                columnDefs: [
                    { responsivePriority: 1, targets: 0 },
                    { responsivePriority: 2, targets: -1 },
                ],
                bFilter: false,
                bInfo: false,
                stateLoadCallback: loadState,
            },
        },
    };

    #tables = new Map();
    #handles = new WeakMap();
    #requests = new WeakMap();
    #visibilityObserver = null;

    constructor(options = {}) {
        this.options = { ...Table.#defaultOptions, ...options };
        this.options.config.debounce ??= 1000;
        dataTable.setTableErrorMode('none');
        this.#init();
    }

    #init() {
        this.#initiateSideEffects();
        this.initTables(document);
    }

    /**
     * @param {Object} container - Element holding the tables or a table itself, the document while the page is loading.
     */
    initTables(container) {
        const tables = [
            ...(container.matches?.(this.options.selectors) ? [container] : []),
            ...(container.querySelectorAll(this.options.selectors) ?? []),
        ];

        for (const table of tables) {
            if ($.fn.dataTable.isDataTable(table)) {
                this.#reportForeignTable(table);

                continue;
            }

            if (table.getClientRects().length) {
                this.#initTable(table);

                continue;
            }

            this.#deferTable(table);
        }
    }

    /**
     * @param {Object} table - Table element.
     */
    #deferTable(table) {
        this.#visibilityObserver ??= new IntersectionObserver(
            (entries, observer) => this.#initShownTables(entries, observer),
            { rootMargin: '100000px' },
        );

        this.#visibilityObserver.observe(table);
    }

    /**
     * @param {Object[]} entries - Entries the observer reports for the tables it watches.
     * @param {Object} observer - Observer reporting them, so each shown table can be dropped from it.
     */
    #initShownTables(entries, observer) {
        const tables = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target)
            .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

        for (const table of tables) {
            observer.unobserve(table);

            if ($.fn.dataTable.isDataTable(table)) {
                this.#reportForeignTable(table);

                continue;
            }

            this.#initTable(table);
        }
    }

    /**
     * A table created by calling the plugin directly rather than going through here misses the
     * configuration and the features every other table on the page is given, and a handle requested for
     * it is never handed over, so whatever waits for one waits for good. Neither surfaces as an error of
     * its own - the table renders, it is only poorer than it should be - so it is reported here.
     *
     * @param {Object} table - Table element.
     *
     * @returns {boolean} Whether the table turned out to have been created by someone else.
     */
    #reportForeignTable(table) {
        if (!$.fn.dataTable.isDataTable(table) || this.#handles.has(table)) {
            return false;
        }

        console.error(
            `Table "${table.id}" was created by calling the plugin directly, so it has none of the ` +
                'configuration and features of the other tables of this page, and no handle to hand ' +
                'over. Request a handle for it instead - see libs/table/table-access.js.',
        );

        return true;
    }

    /**
     * @param {Object} table - Table element.
     */
    #initTable(table) {
        const handle = new TableHandle(table);

        this.#handles.set(table, handle);
        this.#drainRequests(table, handle);

        const api = this.#createApi(table);

        handle.attach(api);
        this.#initFeatures(this.#createData(table, api));
    }

    /**
     * @param {Object} table - Table element.
     * @param {Function} onHandle - Called with the handle of the table.
     */
    #requestHandle(table, onHandle) {
        const handle = this.#handles.get(table);

        if (handle) {
            onHandle(handle);

            return;
        }

        if (!table.matches(this.options.selectors)) {
            throw new Error(
                `Table "${table.id}" is not one of the tables of this page, so it has no handle to hand ` +
                    `over. Tables are matched by "${this.options.selectors}".`,
            );
        }

        this.#reportForeignTable(table);

        this.#requests.set(table, [...(this.#requests.get(table) ?? []), onHandle]);
    }

    /**
     * @param {Object} table - Table element.
     * @param {Object} handle - Handle of the table.
     */
    #drainRequests(table, handle) {
        for (const onHandle of this.#requests.get(table) ?? []) {
            onHandle(handle);
        }

        this.#requests.delete(table);
    }

    /**
     * @param {Object} table - Table element.
     *
     * @returns {Object} Table API instance.
     */
    #createApi(table) {
        if ($.fn.dataTable.isDataTable(table)) {
            return $(table).DataTable({ retrieve: true });
        }

        return $(table)
            .DataTable({ retrieve: true, ...this.#resolveConfiguration(table) })
            .on('dt-error.dt', dataTable.onError);
    }

    /**
     * @param {Object} table - Table element.
     * @param {Object} api - Table API instance.
     *
     * @returns {Object} Data shared with every feature of the table, `requestTable` being how a feature
     *                   reaches a second table - the detail or selected table it keeps in sync - whether or
     *                   not that one has been created yet.
     */
    #createData(table, api) {
        return {
            table,
            api,
            tableId: table.id,
            options: this.options.config,
            translations: this.options.configuration.default.language,
            requestTable: (requested, onHandle) => this.#requestHandle(requested, onHandle),
        };
    }

    /**
     * @param {Object} table - Table element.
     *
     * @returns {Object} DataTables configuration of the table, extended by the features enabled on it.
     */
    #resolveConfiguration(table) {
        const configuration = table.classList.contains('gui-table-data-no-search')
            ? this.options.configuration.noSearch
            : this.options.configuration.default;
        const featureConfigurations = Object.values(Table.FEATURES)
            .filter(({ attribute }) => Table.#isFeatureEnabled(table, attribute))
            .map(({ class: FeatureClass }) => FeatureClass.configuration?.(table) ?? {});

        return Object.assign({}, configuration, ...featureConfigurations);
    }

    /**
     * @param {Object} table - Table element.
     * @param {string|undefined} attribute - Attribute enabling the feature, absent for a feature enabled on every table.
     *
     * @returns {boolean} Whether the feature is enabled on the table.
     */
    static #isFeatureEnabled(table, attribute) {
        return !attribute || table.hasAttribute(attribute);
    }

    #initFeatures(data) {
        const features = {};

        for (const [name, feature] of Object.entries(Table.FEATURES)) {
            const { attribute, class: FeatureClass } = feature;

            if (!Table.#isFeatureEnabled(data.table, attribute)) {
                continue;
            }

            const params = {
                ...data,
                features,
                config: JSON.parse((attribute && data.table.getAttribute(attribute)) || '{}'),
                tables: this.#tables,
            };

            this.#tables.set(data.tableId, params);

            /**
             * @param {Object} element - Table element.
             * @param {Object} api - Table API instance.
             * @param {Object} config - Config for feature.
             * @param {Object} features - Instances of features on current table.
             * @param {string} tableId - Table ID.
             * @param {Object} options - Table options.
             * @param {Object} tables - Map of initialized tables.
             * @param {Object} translations - List of translations for current locale.
             */
            features[name] = new FeatureClass(params);
        }
    }

    /**
     * Tables added after the page has loaded - the one arriving with the content of a dialog, for example -
     * announce themselves with this event, so they are picked up with the same features as the tables which
     * were there from the start. They too are set up only once shown, which the observer takes care of.
     */
    #initiateSideEffects() {
        document.addEventListener(TABLE_INIT_EVENT, (event) => this.initTables(event.target));
        document.addEventListener(TABLE_REQUEST_EVENT, (event) =>
            this.#requestHandle(event.target, event.detail.onHandle),
        );
    }
}
