/**
 * Renders the search controls of the table - the QA hook of the global search box and, wherever the server
 * enabled it, an input per searchable column.
 *
 * @typedef {Object} config
 * @param {string} containerSelector - (Optional) Selector of the element wrapping the table and its controls (default: .dt-container).
 * @param {string} searchSelector - (Optional) Selector of the global search box (default: .dt-search).
 */
export class SearchableTable {
    data = {};

    staticClasses = {
        input: 'form-control form-control-sm column-search',
        odd: 'odd',
        even: 'even',
    };

    staticAttributes = {
        qa: 'data-qa',
        columnIndex: 'data-column-index',
    };

    staticValues = {
        qa: 'table-search',
        searchPlaceholder: 'Search',
    };

    storageKeys = {
        lastParams: 'dt-last-ajax-params',
    };

    constructor(data) {
        this.data = data;

        this.init();
    }

    init() {
        this.setDefaults();
        this.markGlobalSearch();

        if (!this.hasSearchableColumns()) return;

        this.hideGlobalSearch();
        this.data.api.on('draw', () => this.renderSearchRow());
        this.renderSearchRow();
    }

    /**
     * A table the server renders in one go - an import error list, say - sends no request naming which of
     * its columns are searchable, and the plugin holds every column searchable by default. Reading the
     * default would hide the global search box in favour of a row of column inputs which is never built,
     * leaving the table with no search at all, so the ajax parameters are what decides.
     *
     * @returns {boolean} Whether the table is searched by column.
     */
    hasSearchableColumns() {
        if (!this.data.api.ajax.params()) {
            return false;
        }

        return this.data.api.settings()[0].aoColumns.some((column) => column.bSearchable);
    }

    setDefaults() {
        this.data.config.containerSelector ??= '.dt-container';
        this.data.config.searchSelector ??= '.dt-search';
    }

    getContainer() {
        return this.data.table.closest(this.data.config.containerSelector);
    }

    markGlobalSearch() {
        const input = this.getContainer()?.querySelector(`${this.data.config.searchSelector} input[type="search"]`);

        input?.setAttribute(this.staticAttributes.qa, this.staticValues.qa);
    }

    hideGlobalSearch() {
        const search = this.getContainer()?.querySelector(this.data.config.searchSelector);

        if (search) {
            search.style.display = 'none';
        }
    }

    renderSearchRow() {
        const params = this.cacheParams(this.data.api.ajax.params());
        const body = this.data.table.querySelector('tbody');

        if (!params || !body) return;

        const row = this.createSearchRow(params);

        if (row) {
            body.prepend(row);
        }
    }

    /**
     * @param {Object} params - Parameters the table sent to the server, holding which of its columns are searchable.
     *
     * @returns {Object|null} Row of search inputs, or null while the table has no searchable column.
     */
    createSearchRow(params) {
        const row = document.createElement('tr');
        let isSearchable = false;

        row.className = this.resolveRowClass();

        this.data.api.columns().every((index) => {
            const column = params.columns?.[index];
            const cell = document.createElement('td');

            if (column?.searchable) {
                cell.append(this.createSearchInput(index, column.search?.value ?? ''));
                isSearchable = true;
            }

            row.append(cell);
        });

        return isSearchable ? row : null;
    }

    /**
     * @param {number} index - Index of the column searched by the input.
     * @param {string} value - Value the column is currently searched by.
     *
     * @returns {Object} Input element of the column.
     */
    createSearchInput(index, value) {
        const input = document.createElement('input');

        input.type = 'text';
        input.className = this.staticClasses.input;
        input.placeholder = this.data.translations?.searchPlaceholder ?? this.staticValues.searchPlaceholder;
        input.value = value;
        input.setAttribute(this.staticAttributes.columnIndex, index);

        this.searchAction(input, index);

        return input;
    }

    /**
     * @param {Object} input - Input element of the column.
     * @param {number} index - Index of the column searched by the input.
     */
    searchAction(input, index) {
        let timeoutId = 0;

        input.addEventListener('keyup', (event) => {
            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                this.data.api.column(index).search(event.target.value, false, false).draw();
            }, this.data.options.debounce);
        });
    }

    /**
     * @returns {string} Class of the search row.
     */
    resolveRowClass() {
        const rows = this.data.table.querySelectorAll('tr');
        const lastRow = rows[rows.length - 1];

        return lastRow?.className === this.staticClasses.even ? this.staticClasses.odd : this.staticClasses.even;
    }

    /**
     * @param {Object|undefined} params - Parameters of the current draw, if it has any.
     *
     * @returns {Object|undefined} Parameters describing the current state of the table.
     */
    cacheParams(params) {
        if (params) {
            $(this.data.table).data(this.storageKeys.lastParams, params);
        }

        return params ?? $(this.data.table).data(this.storageKeys.lastParams);
    }
}
