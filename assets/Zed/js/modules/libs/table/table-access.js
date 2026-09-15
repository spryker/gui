export const TABLE_REQUEST_EVENT = 'TABLE-REQUEST-EVENT';

/**
 * @param {Object} table - Table element.
 * @param {Function} onHandle - Called with the handle of the table.
 */
export function requestTable(table, onHandle) {
    table.dispatchEvent(
        new CustomEvent(TABLE_REQUEST_EVENT, {
            bubbles: true,
            detail: { onHandle },
        }),
    );
}
