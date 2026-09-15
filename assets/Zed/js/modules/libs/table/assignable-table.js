const DIRECTION_UP = 'up';

/**
 * Assigns items from this table to a second table, keeping the form fields of the assignment in sync.
 *
 * Two storage shapes are supported, told apart by the `data-prototype` attribute of the wrapper: with a
 * prototype the assignment is a form collection and holds many ordered items, without one it is a single
 * form field which holds the last assigned item.
 *
 * @typedef {Object} config
 * @param {string} selectedTableSelector - Selector for the table which holds the assigned items.
 * @param {string} colId - Column ID holding the item ID.
 * @param {string} wrapperSelector - Selector for the wrapper which holds both tables and the form fields.
 * @param {string} inputsWrapperSelector - Selector for the form field holder, inside the wrapper.
 * @param {string} addButtonSelector - Selector for the button which assigns an item.
 * @param {string} removeButtonSelector - Selector for the button which unassigns an item.
 * @param {string} reorderButtonSelector - (Optional) Selector for the buttons which move an assigned item.
 * @param {string} clearAllButtonClass - (Optional) Class of the button which unassigns every item.
 */
export class AssignableTable {
    data = {};
    selectedTable = null;
    wrapper = null;
    inputsWrapper = null;
    colIndexes = {};

    staticAttributes = {
        id: 'data-id',
        direction: 'direction',
        tab: 'tab',
    };

    constructor(data) {
        this.data = data;

        this.init();
    }

    init() {
        this.selectedTable = document.querySelector(this.data.config.selectedTableSelector);
        this.wrapper = this.data.table.closest(this.data.config.wrapperSelector);
        this.inputsWrapper = this.wrapper?.querySelector(this.data.config.inputsWrapperSelector);

        if (!this.selectedTable || !this.inputsWrapper) return;

        this.setColumnIndexes();
        this.setAddAction();
        this.setRemoveAction();
        this.setReorderAction();
        this.setClearAllAction();
    }

    setColumnIndexes() {
        const cols = this.data.api.columns().header().toArray();

        this.colIndexes = {
            id: cols.findIndex((header) => header.id === this.data.config.colId),
        };
    }

    setAddAction() {
        this.data.table.addEventListener('click', (event) => {
            const button = event.target.closest(this.data.config.addButtonSelector);

            if (!button) return;

            event.preventDefault();
            this.addItem(button.dataset.id);
        });
    }

    setRemoveAction() {
        this.selectedTable.addEventListener('click', (event) => {
            const button = event.target.closest(this.data.config.removeButtonSelector);

            if (!button) return;

            event.preventDefault();
            this.removeItem(button.dataset.id, button.closest('tr'));
        });
    }

    setReorderAction() {
        if (!this.data.config.reorderButtonSelector) return;

        this.selectedTable.addEventListener('click', (event) => {
            const button = event.target.closest(this.data.config.reorderButtonSelector);

            if (!button) return;

            event.preventDefault();
            this.moveItem(button.dataset.id, button.dataset[this.staticAttributes.direction], button.closest('tr'));
        });
    }

    setClearAllAction() {
        const button = this.findClearAllButton();

        if (!button) return;

        $(button).off('click').removeClass(this.data.config.clearAllButtonClass);

        button.addEventListener('click', (event) => {
            event.preventDefault();
            this.clearAll();
        });
    }

    findClearAllButton() {
        if (!this.data.config.clearAllButtonClass) return null;

        for (const button of document.querySelectorAll(`.${this.data.config.clearAllButtonClass}`)) {
            const target = button.dataset[this.staticAttributes.tab];

            if (target && document.querySelector(target)?.contains(this.data.table)) {
                return button;
            }
        }

        return null;
    }

    addItem(id) {
        const rowData = this.getRowData(id);

        if (!rowData) return;

        if (this.isSingleValue()) {
            this.setInputValue(id);
            this.getSelectedTableApi().clear().row.add(rowData).draw();

            return;
        }

        if (this.findInput(id)) return;

        this.addInput(id);
        this.getSelectedTableApi().row.add(rowData).draw();
    }

    removeItem(id, row) {
        this.isSingleValue() ? this.setInputValue('') : this.findInput(id)?.remove();
        this.getSelectedTableApi().row(row).remove().draw();
    }

    moveItem(id, direction, row) {
        const api = this.getSelectedTableApi();
        const rows = api.rows().data().toArray();
        const index = api.row(row).index();
        const offset = direction === DIRECTION_UP ? -1 : 1;

        if (index + offset < 0 || index + offset >= rows.length) return;

        rows.splice(index + offset, 0, rows.splice(index, 1)[0]);
        this.moveInput(id, offset);
        api.clear().rows.add(rows).draw();
    }

    clearAll() {
        this.isSingleValue() ? this.setInputValue('') : this.inputsWrapper.replaceChildren();
        this.getSelectedTableApi().clear().draw();
    }

    getSelectedTableApi() {
        return $(this.selectedTable).DataTable({ retrieve: true });
    }

    getRowData(id) {
        const rows = this.data.api.rows().data().toArray();
        const row = rows.find((item) => String(item[this.colIndexes.id]) === String(id));

        if (!row) return null;

        const rowData = [...row];
        rowData.splice(-1, 1);
        rowData.push(this.getButtonsTemplate(id));

        return rowData;
    }

    getButtonsTemplate(id) {
        const template = document.createElement('template');
        template.innerHTML = this.wrapper.dataset.deleteButton ?? '';

        for (const button of template.content.children) {
            button.setAttribute(this.staticAttributes.id, id);
        }

        return template.innerHTML;
    }

    isSingleValue() {
        return !this.wrapper.dataset.prototype;
    }

    findInput(id) {
        return this.inputsWrapper.querySelector(`input[value="${id}"]`);
    }

    setInputValue(id) {
        this.inputsWrapper.querySelector('input')?.setAttribute('value', id);
    }

    addInput(id) {
        const template = document.createElement('template');
        template.innerHTML = this.getInputTemplate().trim();

        const element = template.content.firstElementChild;
        const input = element.matches('input') ? element : element.querySelector('input');

        input.setAttribute('value', id);
        this.inputsWrapper.append(element);
    }

    getInputTemplate() {
        const indexes = [0];

        for (const input of this.inputsWrapper.querySelectorAll('input')) {
            indexes.push(Number(input.name.match(/\d+/g)?.pop() ?? 0));
        }

        return this.wrapper.dataset.prototype.replace(/__name__/g, String(Math.max(...indexes) + 1));
    }

    moveInput(id, offset) {
        const input = this.findInput(id);
        const sibling = offset < 0 ? input?.previousElementSibling : input?.nextElementSibling;

        if (!sibling) return;

        offset < 0 ? sibling.before(input) : sibling.after(input);
    }
}
