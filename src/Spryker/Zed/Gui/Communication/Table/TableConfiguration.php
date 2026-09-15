<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Table;

class TableConfiguration
{
    /**
     * @var string
     */
    public const SORT_ASC = 'asc';

    /**
     * @var string
     */
    public const SORT_DESC = 'desc';

    /**
     * @var string|null
     */
    protected $url;

    /**
     * @var array
     */
    protected $header = [];

    /**
     * @var array
     */
    protected $footer = [];

    /**
     * @var array<string>
     */
    protected $extraColumns = [];

    /**
     * @var int
     */
    protected $pageLength = 0;

    /**
     * If null it will use all fields defined in $header.
     *
     * @var array<string>|null
     */
    protected $searchableFields;

    /**
     * @var array<string, string>
     */
    protected $searchableColumns = [];

    /**
     * @var array<string>
     */
    protected $sortableFields = [];

    /**
     * @var array<string, string>|null
     */
    protected $defaultSortField;

    /**
     * @deprecated Use $defaultSortField instead.
     *
     * @var int
     */
    protected $defaultSortColumnIndex = 0;

    /**
     * @deprecated Use $defaultSortField instead.
     *
     * @var string
     */
    protected $defaultSortDirection = self::SORT_ASC;

    /**
     * @var array
     */
    protected $rawColumns = [];

    /**
     * @var bool
     */
    protected $stateSave = true;

    /**
     * @var bool
     */
    protected $processing = true;

    /**
     * @var bool
     */
    protected $serverSide = true;

    /**
     * @var bool
     */
    protected $paging = true;

    /**
     * @var bool
     */
    protected $ordering = true;

    /**
     * @var bool
     */
    protected $hasSearchableFieldsWithAggregateFunctions = false;

    /**
     * @var bool|null
     */
    protected ?bool $useSimplePagination = null;

    /**
     * @var bool|null
     */
    protected ?bool $useCaseSensitiveSearch = null;

    /**
     * @var bool|null
     */
    protected ?bool $useSorting = null;

    /**
     * @var array<string, mixed>
     */
    protected array $tableAttributes = [];

    /**
     * @var array<string, mixed>
     */
    protected array $headerAttributes = [];

    /**
     * @return array
     */
    public function getRawColumns()
    {
        return $this->rawColumns;
    }

    public function getHasSearchableFieldsWithAggregateFunctions(): bool
    {
        return $this->hasSearchableFieldsWithAggregateFunctions;
    }

    /**
     * @param bool $hasSearchableFieldsWithAggregateFunctions
     *
     * @return $this
     */
    public function setHasSearchableFieldsWithAggregateFunctions(bool $hasSearchableFieldsWithAggregateFunctions)
    {
        $this->hasSearchableFieldsWithAggregateFunctions = $hasSearchableFieldsWithAggregateFunctions;

        return $this;
    }

    /**
     * @return array<string, string>
     */
    public function getTableAttributes(): array
    {
        return $this->tableAttributes;
    }

    /**
     * @param array<string, mixed> $tableAttributes
     *
     * @return void
     */
    public function setTableAttributes(array $tableAttributes): void
    {
        $this->tableAttributes = $tableAttributes;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function getHeaderAttributes(): array
    {
        return $this->headerAttributes;
    }

    /**
     * @param array<string, mixed> $headerAttributes
     *
     * @return void
     */
    public function setHeaderAttributes(array $headerAttributes): void
    {
        $this->headerAttributes = $headerAttributes;
    }

    /**
     * @param array $rawColumns
     *
     * @return $this
     */
    public function setRawColumns(array $rawColumns)
    {
        $this->rawColumns = $rawColumns;

        return $this;
    }

    /**
     * @param string $column
     *
     * @return $this
     */
    public function addRawColumn($column)
    {
        $this->rawColumns[] = $column;

        return $this;
    }

    /**
     * @return array
     */
    public function getHeader()
    {
        return $this->header;
    }

    /**
     * @param array $header Provide php names for table columns
     *   if you are going to user Propel Query as data population
     *
     * @return void
     */
    public function setHeader(array $header)
    {
        if ($this->isAssoc($header)) {
            $this->header = $header;
        }
    }

    /**
     * @return array
     */
    public function getFooter()
    {
        return $this->footer;
    }

    /**
     * @param array $footer
     *
     * @return void
     */
    public function setFooter(array $footer)
    {
        $this->footer = $footer;
    }

    /**
     * @return $this
     */
    public function setFooterFromHeader()
    {
        if (!$this->getHeader()) {
            return $this;
        }

        $headerKeys = array_keys($this->getHeader());
        $this->setFooter($headerKeys);

        return $this;
    }

    /**
     * @param array<string> $extraColumns
     *
     * @return $this
     */
    public function setExtraColumns(array $extraColumns)
    {
        $this->extraColumns = $extraColumns;

        return $this;
    }

    /**
     * @return array<string>
     */
    public function getExtraColumns()
    {
        return $this->extraColumns;
    }

    /**
     * @return array<string>
     */
    public function getSortable()
    {
        return $this->sortableFields;
    }

    /**
     * @param array<string> $sortable
     *
     * @return void
     */
    public function setSortable(array $sortable)
    {
        $this->sortableFields = array_intersect($sortable, array_keys($this->header));
    }

    /**
     * @return array<string>
     */
    public function getSearchable()
    {
        $searchable = $this->searchableFields ?: array_keys($this->header);

        return array_values($searchable);
    }

    /**
     * Accepts either a plain list of SQL expressions (`['spy_product.name', 'spy_product.sku']`) used only for
     * the global search box, or an associative `[headerKey => sqlExpression]` array (e.g.
     * `['NAME' => 'spy_product.name', 'SKU' => 'spy_product.sku']`) which also doubles as the map
     * `getSearchableColumns()` needs to power per-column search for the same fields — no separate
     * `setSearchableColumns()` call required in that case.
     *
     * @param array<string> $searchable
     *
     * @return void
     */
    public function setSearchable(array $searchable)
    {
        $this->searchableFields = $searchable;
    }

    /**
     * Returns whether the table renders per-column search inputs (one for each column listed in
     * `searchableColumns`, hiding the global search box) instead of the single global search box — driven
     * entirely by whether `searchableColumns` was configured (via `setSearchableColumns()`, or `setSearchable()`
     * with an associative array), no separate opt-in flag needed.
     */
    public function isColumnSearchEnabled(): bool
    {
        return $this->getSearchableColumns() !== [];
    }

    /**
     * @return int
     */
    public function getPageLength()
    {
        return $this->pageLength;
    }

    /**
     * @param int $length
     *
     * @return void
     */
    public function setPageLength($length)
    {
        $this->pageLength = $length;
    }

    /**
     * @return string|null
     */
    public function getUrl()
    {
        return $this->url;
    }

    /**
     * @param string $url
     *
     * @return void
     */
    public function setUrl($url)
    {
        $this->url = $url;
    }

    /**
     * @param string $field
     * @param string $direction
     *
     * @return void
     */
    public function setDefaultSortField($field, $direction = self::SORT_ASC)
    {
        $this->defaultSortField = [$field => $direction];
    }

    /**
     * @return array<string, string>
     */
    public function getDefaultSortField()
    {
        return $this->defaultSortField;
    }

    /**
     * @deprecated Use {@link setDefaultSortField()} instead.
     *
     * @param int $columnIndex
     *
     * @return void
     */
    public function setDefaultSortColumnIndex($columnIndex)
    {
        $this->defaultSortColumnIndex = $columnIndex;
    }

    /**
     * @deprecated Use {@link getDefaultSortField()} instead.
     *
     * @return int
     */
    public function getDefaultSortColumnIndex()
    {
        return $this->defaultSortColumnIndex;
    }

    /**
     * @deprecated Use {@link setDefaultSortField()} instead.
     *
     * @param string $direction
     *
     * @return void
     */
    public function setDefaultSortDirection($direction)
    {
        $this->defaultSortDirection = $direction;
    }

    /**
     * @deprecated Use {@link getDefaultSortField()} instead.
     *
     * @return string
     */
    public function getDefaultSortDirection()
    {
        return $this->defaultSortDirection;
    }

    /**
     * @param array $arr
     *
     * @return bool
     */
    protected function isAssoc(array $arr)
    {
        return (array_values($arr) !== $arr);
    }

    /**
     * @return bool
     */
    public function isStateSave()
    {
        return $this->stateSave;
    }

    /**
     * @param bool $stateSave
     *
     * @return void
     */
    public function setStateSave($stateSave)
    {
        $this->stateSave = $stateSave;
    }

    public function isProcessing(): ?bool
    {
        return $this->processing;
    }

    /**
     * @param bool $processing
     *
     * @return void
     */
    public function setProcessing(bool $processing)
    {
        $this->processing = $processing;
    }

    public function isServerSide(): ?bool
    {
        return $this->serverSide;
    }

    /**
     * @param bool $serverSide
     *
     * @return void
     */
    public function setServerSide(bool $serverSide)
    {
        $this->serverSide = $serverSide;
    }

    public function isPaging(): ?bool
    {
        return $this->paging;
    }

    /**
     * @param bool $paging
     *
     * @return void
     */
    public function setPaging(bool $paging)
    {
        $this->paging = $paging;
    }

    public function isOrdering(): ?bool
    {
        return $this->ordering;
    }

    /**
     * @param bool $ordering
     *
     * @return void
     */
    public function setOrdering(bool $ordering)
    {
        $this->ordering = $ordering;
    }

    /**
     * Returns the `[headerKey => sqlExpression]` map used to render and query per-column search. Merges the
     * associative array given to `setSearchable()` (if any) with an explicit `setSearchableColumns()` call, so
     * a table can configure the two independently or together — on a key collision, the `setSearchable()`
     * entry wins.
     *
     * @return array<string, string>
     */
    public function getSearchableColumns(): array
    {
        if ($this->searchableFields === null || array_is_list($this->searchableFields)) {
            return $this->searchableColumns;
        }

        return array_merge($this->searchableColumns, $this->searchableFields);
    }

    /**
     * `null` means neither this table's `configure()` nor the project-wide `GuiConfig` default set an explicit
     * value — `AbstractTable` will resolve it adaptively based on table size before the query runs.
     */
    public function isSimplePaginationEnabled(): ?bool
    {
        return $this->useSimplePagination;
    }

    /**
     * Skips both the `recordsTotal` and `recordsFiltered` `COUNT(*)` queries entirely, replacing them with a
     * cheap "is there a next page" check (one extra row fetched alongside the current page). In exchange,
     * the table UI switches to Previous/Next-only pagination (no page numbers, no "of N entries" text) —
     * this mode never claims to know an exact total or page count, so there is nothing misleading to show.
     */
    public function setUseSimplePagination(?bool $useSimplePagination): void
    {
        $this->useSimplePagination = $useSimplePagination;
    }

    /**
     * `null` means neither this table's `configure()` nor the project-wide `GuiConfig` default set an explicit
     * value — `AbstractTable` will resolve it adaptively based on table size before the query runs.
     */
    public function isCaseSensitiveSearchEnabled(): ?bool
    {
        return $this->useCaseSensitiveSearch;
    }

    /**
     * Matches the global search box against searchable columns with an exact, case-sensitive `=` comparison
     * instead of a fuzzy `LOWER(column) LIKE '%term%'` comparison — the fuzzy pattern cannot use a regular index,
     * so this speeds up search on large tables at the cost of only finding exact matches, not partial ones.
     */
    public function setUseCaseSensitiveSearch(?bool $useCaseSensitiveSearch): void
    {
        $this->useCaseSensitiveSearch = $useCaseSensitiveSearch;
    }

    /**
     * `null` means neither this table's `configure()` nor the project-wide `GuiConfig` default set an explicit
     * value — `AbstractTable` will resolve it adaptively based on table size before the query runs.
     */
    public function isSortingEnabled(): ?bool
    {
        return $this->useSorting;
    }

    /**
     * Skips applying `ORDER BY` to the underlying query entirely. Rows are then returned in whatever order the
     * query naturally produces (join order), which is unpredictable but avoids forcing the database to
     * materialize and sort the full joined result set when no index can satisfy the requested order — the
     * dominant cost on very large tables with joins that break index-order delivery.
     */
    public function setUseSorting(?bool $useSorting): void
    {
        $this->useSorting = $useSorting;
    }

    /**
     * Configures per-column search independently of `setSearchable()` — lets a table keep its existing plain
     * list of global-search fields untouched and add per-column search as a separate, additive call. Merged
     * with any associative array given to `setSearchable()` if both are used together.
     *
     * @param array<string, string> $searchableColumns
     *
     * @return void
     */
    public function setSearchableColumns(array $searchableColumns): void
    {
        $this->searchableColumns = $searchableColumns;
    }
}
