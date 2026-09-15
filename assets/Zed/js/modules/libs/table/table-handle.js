const EVENT_DRAW = 'draw';
const EVENT_LOADING = 'loading';

const PLUGIN_EVENTS = {
    [EVENT_DRAW]: 'draw.dt',
    [EVENT_LOADING]: 'processing.dt',
};

export class TableHandle {
    #table;
    #api = null;
    #created;
    #announceCreated;
    #initialized;

    /**
     * @param {Object} table - Table element.
     * @param {Object|null} api - Table API instance, absent while the table is still to be created.
     */
    constructor(table, api = null) {
        this.#table = table;
        this.#created = new Promise((resolve) => (this.#announceCreated = resolve));
        this.#initialized = $.fn.dataTable.isDataTable(table);

        $(table).one('init.dt', () => (this.#initialized = true));

        if (api) {
            this.attach(api);
        }
    }

    /**
     * Handed the API once the plugin has created the table. Subscriptions are unaffected: the plugin fires
     * its events on the table element, so they are bound there and work either side of this point.
     *
     * @param {Object} api - Table API instance.
     */
    attach(api) {
        this.#api = api;
        this.#announceCreated(api);
    }

    /**
     * Awaited by a consumer which reads or writes rows rather than only subscribing to events, since the
     * handle is handed over before the table exists.
     *
     * @returns {Promise} Resolved with the table API instance once the plugin has created the table.
     */
    created() {
        return this.#created;
    }

    /**
     * @param {string} name - Name of the event, one of `PLUGIN_EVENTS`.
     * @param {Function} callback - Called with a description of the event, see `#describe`.
     *
     * @returns {Object} This handle, so subscriptions can be chained.
     */
    on(name, callback) {
        const event = PLUGIN_EVENTS[name];

        if (!event) {
            throw new Error(
                `Table event "${name}" is unknown. Known events: ${Object.keys(PLUGIN_EVENTS).join(', ')}.`,
            );
        }

        $(this.#table).on(event, (pluginEvent, _settings, state) => {
            this.#api ??= pluginEvent.dt;

            callback(this.#describe(name, state));
        });

        return this;
    }

    /**
     *
     * @param {string} url - URL the rows of the table are loaded from.
     *
     * @returns {Promise} Resolved once the rows have been loaded and drawn.
     */
    reload(url) {
        return this.#created.then((api) => new Promise((resolve) => api.ajax.url(url).load(resolve)));
    }

    /**
     * Loads the rows again from the URL the table already has, keeping the page it is on - for showing
     * the effect of something done to a row without sending the reader back to the first page.
     *
     * @returns {Promise} Resolved once the rows have been loaded and drawn.
     */
    refresh() {
        return this.#created.then((api) => new Promise((resolve) => api.ajax.reload(resolve, false)));
    }

    /**
     *
     * @returns {Promise} Resolved once the columns have been measured again.
     */
    refreshLayout() {
        return this.#created.then((api) => {
            api.columns.adjust();
            api.responsive?.recalc();
        });
    }

    /**
     * @returns {Array} Rows of the table, each one an array of its cells.
     */
    rowsData() {
        return this.#requireApi().rows().data().toArray();
    }

    /**
     * @returns {Object} Table API instance.
     */
    raw() {
        return this.#requireApi();
    }

    /**
     * @param {string} name - Name of the event, one of `PLUGIN_EVENTS`.
     * @param {*} state - State the plugin passed with the event, if any.
     *
     * @returns {Object} Description of the event.
     */
    #describe(name, state) {
        if (name === EVENT_DRAW) {
            return { initial: !this.#initialized };
        }

        return { loading: state === true };
    }

    /**
     * @returns {Object} Table API instance.
     */
    #requireApi() {
        if (!this.#api) {
            throw new Error(
                `Table "${this.#table.id}" has not been created yet, so it has no rows to read. A handle is ` +
                    'given out before its table exists so that events can be subscribed to; read from one ' +
                    'of them, or use reload() which waits for the table.',
            );
        }

        return this.#api;
    }
}
