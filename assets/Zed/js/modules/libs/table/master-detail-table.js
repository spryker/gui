export const MASTER_DETAIL_TABLE_SELECTED = 'MASTER-DETAIL-TABLE-SELECTED';

/**
 * @typedef {Object} config
 * @param {string} detailTableSelector - Selector for the table reloaded when a row of the master table is selected.
 * @param {string} param - Name of the query parameter appended to the detail table ajax URL.
 * @param {string} colId - Column ID holding the value passed to the detail table.
 * @param {string} colLabel - (Optional) Column ID holding the label of the selected row.
 * @param {string} labelSelector - (Optional) Selector for the element which shows the label of the selected row.
 * @param {string} wrapperSelector - (Optional) Wrapper hidden while the master table has no rows (default: .wrapper > .row).
 * @param {string} emptyValue - (Optional) Value sent to the detail table while the master table has no rows (default: 0).
 */
export class MasterDetailTable {
    data = {};
    detailTable = null;
    detailHandle = null;
    detailUrl = null;
    requested = false;
    colIndexes = {};
    loaded = false;

    staticClasses = {
        child: 'child',
    };

    constructor(data) {
        this.data = data;

        this.init();
    }

    init() {
        this.setDefaults();

        this.detailTable = document.querySelector(this.data.config.detailTableSelector);

        if (!this.detailTable?.dataset.ajax) return;

        this.setColumnIndexes();
        this.setupTable();
    }

    setDefaults() {
        this.data.config.wrapperSelector ??= '.wrapper > .row';
        this.data.config.emptyValue ??= 0;
    }

    setColumnIndexes() {
        const cols = this.data.api.columns().header().toArray();

        this.colIndexes = {
            id: cols.findIndex((header) => header.id === this.data.config.colId),
            label: cols.findIndex((header) => header.id === this.data.config.colLabel),
        };
    }

    setupTable() {
        this.data.table.addEventListener('click', (event) => this.rowClickAction(event));
        this.data.api.on('draw', () => this.selectFirstRow());
        this.data.api.on('select', (event, api, type, indexes) => this.loadDetailTable(api.row(indexes[0]).data()));
    }

    rowClickAction(event) {
        if (event.target.tagName !== 'TD') return;

        const row = event.target.closest(`tbody > tr:not(.${this.staticClasses.child})`);

        if (!row) return;

        this.selectRow(row);
    }

    selectFirstRow() {
        this.toggleDetailTable(this.data.api.rows().count() !== 0);
        this.selectRow(0);
    }

    /**
     * @param {Object|number} row - Row node or row index.
     */
    selectRow(row) {
        this.data.api.rows().deselect();
        this.data.api.row(row).select();
    }

    loadDetailTable(rowData) {
        this.loaded = true;

        this.setLabel(rowData[this.colIndexes.label]);
        this.reloadDetailTable(rowData[this.colIndexes.id]);
        this.dispatchSelected(rowData[this.colIndexes.id]);
    }

    toggleDetailTable(state) {
        const wrapper = this.detailTable.closest(this.data.config.wrapperSelector);

        if (wrapper) {
            wrapper.style.display = state ? '' : 'none';
        }

        if (!state && this.loaded) {
            this.reloadDetailTable(this.data.config.emptyValue);
        }
    }

    /**
     * @param {string|number} value - Value of the selected master row the detail table is loaded for.
     */
    reloadDetailTable(value) {
        this.detailUrl = this.getDetailUrl(value);

        if (this.detailHandle) {
            this.detailHandle.reload(this.detailUrl);

            return;
        }

        if (this.requested) {
            return;
        }

        this.requested = true;

        this.data.requestTable(this.detailTable, (handle) => {
            this.detailHandle = handle;
            handle.reload(this.detailUrl);
        });
    }

    getDetailUrl(value) {
        const url = new URL(this.detailTable.dataset.ajax, window.location.origin);

        url.searchParams.set(this.data.config.param, value);

        return `${url.pathname}${url.search}`;
    }

    setLabel(label) {
        if (!this.data.config.labelSelector || this.colIndexes.label === -1) return;

        const element = document.querySelector(this.data.config.labelSelector);

        if (element) {
            element.textContent = label;
        }
    }

    dispatchSelected(value) {
        this.detailTable.dispatchEvent(
            new CustomEvent(MASTER_DETAIL_TABLE_SELECTED, {
                detail: {
                    id: this.data.tableId,
                    detailTableId: this.detailTable.id,
                    value,
                },
                bubbles: true,
            }),
        );
    }
}
