/**
 * A table resolves the buttons of its pagination from this registry on every draw, while the type naming
 * them is read once, as the table is being created. Registering a type of our own is what turns that into
 * a decision which can be taken again later: whether a table is served with a count of its rows is up to
 * the server and only known once it has answered, and answering with the buttons the table needs at the
 * moment it is drawn saves rebuilding it around a pagination it was not created with.
 */
const ADAPTIVE_PAGING_TYPE = 'gui-adaptive';

const SIMPLE_PAGING_BUTTONS = ['previous', 'next'];

const COUNTED_PAGING_BUTTONS = ['first', 'previous', 'numbers', 'next', 'last'];

/**
 * @param {Object} opts - Options of the pagination, holding the table it belongs to.
 *
 * @returns {Array} Buttons the pagination of the table is built from.
 */
$.fn.dataTable.ext.pager[ADAPTIVE_PAGING_TYPE] = (opts) =>
    isSimplePaginationActive(opts.table) ? SIMPLE_PAGING_BUTTONS : COUNTED_PAGING_BUTTONS;

/**
 * @param {Object|undefined} table - Table element the pagination belongs to.
 *
 * @returns {boolean} Whether the server is serving the table without counting its rows.
 */
function isSimplePaginationActive(table) {
    if (!table || !$.fn.dataTable.isDataTable(table)) {
        return false;
    }

    return $(table).DataTable().ajax.json()?.simplePaginationActive === true;
}

/**
 * @typedef {Object} config
 * @param {string} containerSelector - (Optional) Selector of the element the hint is rendered into (default: .dt-container).
 */
export class PerformanceTable {
    data = {};
    isResettingPage = false;

    staticClasses = {
        hint: 'dataTables_performance-hint',
        alert: 'alert alert-info',
    };

    storageKeys = {
        lastResponse: 'dt-last-json',
    };

    /**
     * @param {Object} table - Table element.
     *
     * @returns {Object} Configuration contributed to the table this feature is initialized on.
     */
    static configuration(table) {
        return {
            pagingType: ADAPTIVE_PAGING_TYPE,
            layout: { bottomEnd: { paging: { table } } },
        };
    }

    constructor(data) {
        this.data = data;

        this.init();
    }

    init() {
        this.setDefaults();

        this.data.api.on('draw', () => this.drawAction());
        this.drawAction();
    }

    setDefaults() {
        this.data.config.containerSelector ??= '.dt-container';
    }

    drawAction() {
        const response = this.cacheResponse(this.data.api.ajax.json());

        if (this.resetOutOfRangePage(response)) {
            return;
        }

        this.togglePerformanceModeHint(response?.performanceModeMessage);
        this.toggleInfo(response?.simplePaginationActive !== true);
    }

    /**
     * A server-side table is paged by the server, so DataTables restores the saved offset without
     * checking it against a row count it does not have yet - the clamp it applies to a client-side
     * table is skipped. Once the server has answered, the count is known: an offset reaching past it
     * leaves the table drawn empty with no page of the pagination marked current, which is what
     * happens when a filter restored alongside the offset narrows the result set to fewer pages than
     * the one the reader left from.
     *
     * @param {Object|undefined} response - Response describing the current state of the table.
     *
     * @returns {boolean} Whether the table is being redrawn on the first page, making this draw obsolete.
     */
    resetOutOfRangePage(response) {
        const total = Number(response?.recordsFiltered);
        const { start } = this.data.api.page.info();

        if (this.isResettingPage || !Number.isFinite(total) || total <= 0 || start < total) {
            return false;
        }

        this.isResettingPage = true;
        this.data.api.page(0).draw('page');

        return true;
    }

    /**
     * @param {Object|undefined} response - Response of the current draw, if it has one.
     *
     * @returns {Object|undefined} Response describing the current state of the table.
     */
    cacheResponse(response) {
        if (response) {
            $(this.data.table).data(this.storageKeys.lastResponse, response);
        }

        return response ?? $(this.data.table).data(this.storageKeys.lastResponse);
    }

    /**
     * @param {string|null|undefined} message - Message of the server, set while the optimizations are active.
     */
    togglePerformanceModeHint(message) {
        const container = this.data.table.closest(this.data.config.containerSelector);

        if (!container) return;

        const hint = container.querySelector(`.${this.staticClasses.hint}`);

        if (!message) {
            hint?.remove();

            return;
        }

        if (hint) {
            hint.textContent = message;

            return;
        }

        container.prepend(this.createHint(message));
    }

    /**
     * @param {string} message - Message of the server.
     *
     * @returns {Object} Hint element.
     */
    createHint(message) {
        const hint = document.createElement('div');

        hint.className = `${this.staticClasses.hint} ${this.staticClasses.alert}`;
        hint.textContent = message;

        return hint;
    }

    /**
     * @param {boolean} state - Whether the summary is shown.
     */
    toggleInfo(state) {
        const container = this.data.table.closest(this.data.config.containerSelector);
        const info = container?.querySelector(`.${this.data.api.settings()[0].oClasses.info.container}`);

        if (info) {
            info.style.display = state ? '' : 'none';
        }
    }
}
