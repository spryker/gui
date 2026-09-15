# Zed tables

Every Back Office table is created and configured in one place: the orchestrator in [`table.js`](table.js).
Modules do not create tables. They either describe what they need from PHP, or ask for a handle.

```
PHP TableConfiguration          twig                       table.js                    feature classes
setTableAttributes([...])  ->   data-selectable='{...}'  -> matches selector        ->  new SelectableTable(data)
                                class="gui-table-data"      creates the table
                                                            hands out the handle  ->   requestTable(el, cb)
```

## Why this exists

Before, each module called `$('#my-table').DataTable()` itself. Three problems followed from that, and the
whole design here is a response to them.

**Configuration drifted.** Every caller passed its own options, so responsive behaviour, translations, state
handling and paging differed table by table. They now come from one place — `Table.#defaultOptions` — and no
caller can opt out by accident.

**Off-screen tables did work nobody asked for.** A table in a closed tab was created against a zero-width
container, so it sized its columns against nothing, and a server-side table fetched rows the user might never
look at. Tables without a layout are now held back by an `IntersectionObserver` and created when shown.

**`retrieve: true` silently created bare tables.** It reads as "retrieve only", but the plugin _creates_ the
table when none exists. Because deferred tables do not exist at `ready`, `$(el).DataTable({retrieve: true})`
won when it raced the orchestrator, producing a table with no shared configuration and no features — and the
orchestrator then skipped it for good. This is the single most common bug this directory prevents.

## The rule

**Only files in this directory may name the DataTables plugin.** Everywhere else, a direct
`$(el).DataTable()` on an orchestrator-owned table is a bug, not a shortcut. See
[`.claude/rules/table.md`](../../../../../../../../../.claude/rules/table.md).

An orchestrator-owned table is one matching `.gui-table-data[id]` or `.gui-table-data-no-search[id]`. Both
Gui table partials render that class, so any table from `AbstractTable` qualifies.

## Working with a table from a module

### 1. Prefer PHP — no JavaScript at all

Most needs are a feature that already exists. Declare it on the table and ship no JS:

```php
$config->setTableAttributes([
    'data-selectable' => [
        'moveToSelector' => '#productsToBeAssigned',
        'inputSelector' => '#productListAggregate_productIdsToBeAssigned',
        'counterHolderSelector' => 'a[href="#tab-content-assignment_product"]',
        'colId' => 'spy_product.id_product',
    ],
]);
```

The array is JSON-encoded onto the `<table>` and arrives as `data.config` in the feature. Columns are
addressed by **header id** (the key in `setHeader()`), never by index — so reordering columns cannot break a
feature.

### 2. Otherwise take a handle

Reach the orchestrator over the DOM. Never `import { Table }` — each Zed module is a separate bundle, so an
import inlines a second orchestrator whose registry knows none of the page's tables.

```js
var tableAccess = require('ZedGuiModules/libs/table/table-access');

var element = document.querySelector('#my-table');

if (!element) {
    return;
}

tableAccess.requestTable(element, function (handle) {
    handle.on('draw', function (draw) {
        /* draw.initial === the table's first draw */
    });

    handle.reload(url).then(function () {
        handle.refreshLayout();
    });
});
```

The handle arrives **before the table exists**, so subscriptions are in place for the first draw. That
matters: there is deliberately no `init` event, because it fires during creation and a later subscriber could
never receive it. Use `draw.initial` instead.

| Need                     | Use                                            |
| ------------------------ | ---------------------------------------------- |
| React to a redraw        | `handle.on('draw', cb)` — `cb({ initial })`    |
| React to loading state   | `handle.on('loading', cb)` — `cb({ loading })` |
| Load rows from a new URL | `handle.reload(url)` → Promise                 |
| Reload, keeping the page | `handle.refresh()` → Promise                   |
| Re-measure columns       | `handle.refreshLayout()` → Promise             |
| Read rows                | `handle.rowsData()`                            |
| Anything else            | `handle.raw()` — the plugin API                |

`reload()` / `refresh()` / `refreshLayout()` wait for the table. **`rowsData()` and `raw()` throw if the
table is not created yet** — call them from inside a subscription or a user-event handler, or guard on the
handle being set.

`raw()` is the escape hatch, and every call is plugin coupling: `grep -rn '\.raw()' src` is the migration
list. Prefer extending `TableHandle` over spreading `raw()`.

### 3. Tables added after page load

A table arriving with dialog content or an AJAX fragment must announce itself, or the orchestrator never sees
it:

```js
var table = require('ZedGuiModules/libs/table/table');

container.dispatchEvent(new CustomEvent(table.TABLE_INIT_EVENT, { bubbles: true }));
```

## Adding a feature

Features are classes registered in `Table.FEATURES`, constructed once per table that enables them:

```js
Table.FEATURES = {
    ...Table.FEATURES,
    skeleton: { attribute: 'data-skeleton', class: InternalSkeletonTable },
};
```

A feature with no `attribute` runs on **every** table (`performance`, `searchable`). Each receives one
`data` object:

| Key                        | What it is                                             |
| -------------------------- | ------------------------------------------------------ |
| `table`                    | The `<table>` element                                  |
| `api`                      | The plugin API instance                                |
| `tableId`                  | `table.id`                                             |
| `config`                   | The parsed `data-*` attribute of this feature          |
| `features`                 | Sibling features on this table                         |
| `tables`                   | Map of every initialized table                         |
| `requestTable`             | `(element, cb)` — reach a second table, created or not |
| `options` / `translations` | Shared config and the current locale's strings         |

A static `configuration(table)` on the class contributes DataTables options at creation time — that is how
`PerformanceTable` installs its pagination type.

Use `requestTable` for cross-table work: the second table is often in a closed tab and does not exist yet.
`MasterDetailTable` does this. `SelectableTable` does not yet — it still reaches its destination table with
`$(el).DataTable({retrieve: true})`, which is one of the call sites left to migrate in here.

## The files

| File                                               | Role                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`table.js`](table.js)                             | Orchestrator — finds, defers, creates and configures tables; owns `FEATURES` |
| [`table-access.js`](table-access.js)               | The public door: `requestTable(element, cb)` over a DOM event                |
| [`table-handle.js`](table-handle.js)               | What a module gets — events, reload, layout, rows, `raw()`                   |
| [`performance-table.js`](performance-table.js)     | Adaptive pagination + hint when the server skips counting rows               |
| [`searchable-table.js`](searchable-table.js)       | Global search box and per-column search inputs                               |
| [`selectable-table.js`](selectable-table.js)       | Checkbox selection moved into a second table (`data-selectable`)             |
| [`assignable-table.js`](assignable-table.js)       | Assign/unassign with form-collection fields (`data-assignable`)              |
| [`master-detail-table.js`](master-detail-table.js) | Row selection reloading a detail table (`data-master-detail`)                |
| [`filterable-table.js`](filterable-table.js)       | External filter fields bound to columns (`data-filterable`)                  |
| [`table-file-uploader.js`](table-file-uploader.js) | Upload a file and preselect the rows it names (`data-uploader`)              |

## Traps

**Not every `.DataTable()` outside this directory is a bug.** Two kinds are legitimate:

- _Teardown._ `ContentGui/content-item-editor-dialog.js` destroys tables when its dialog empties. Handles are
  keyed by the element and there is no removal path, so this must stay until `TableHandle` can tear a table
  down. Converting it would log a foreign-table error on every reopen.
- _Foreign tables._ A table that is not `gui-table-data` is not ours; `requestTable` throws on it. Either add
  the class so the orchestrator owns it, or leave the call alone.

**A selector matching nothing is silent.** `$(sel).on('draw.dt', ...)` on a missing element is a no-op, so
dead handlers survive for years. `requestTable` throws instead, which turns that silence into a TypeError
that aborts the enclosing `ready` callback. Grep the templates before converting; if nothing renders the
selector, delete the handler.

**Server-rendered tables send no ajax parameters.** Features that read `api.ajax.params()` or
`api.ajax.json()` must cope with `undefined` — `SearchableTable.hasSearchableColumns()` and
`PerformanceTable.cacheResponse()` both do. Reading a plugin default instead is how the global search box
once disappeared from static tables.
