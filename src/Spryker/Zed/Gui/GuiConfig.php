<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui;

use Spryker\Shared\Gui\GuiConstants;
use Spryker\Zed\Kernel\AbstractBundleConfig;

class GuiConfig extends AbstractBundleConfig
{
    /**
     * @var string
     */
    protected const FORM_RESOURCES_PATH = '/Presentation/Form/Type';

    /**
     * @var array<string>
     */
    protected const FORM_DEFAULT_TEMPLATE_FILE_NAMES = [
        'form_div_layout.html.twig',
        'bootstrap_5_layout.html.twig',
    ];

    /**
     * @var string
     */
    protected const TABS_DEFAULT_TEMPLATE_PATH = '@Gui/Tabs/tabs.twig';

    /**
     * @var string
     */
    protected const SUBMIT_BUTTON_DEFAULT_TEMPLATE_PATH = '@Gui/Form/button/submit_button.twig';

    /**
     * @var string
     */
    protected const MODAL_DEFAULT_TEMPLATE_PATH = '@Gui/Modal/modal.twig';

    /**
     * @var string
     */
    protected const PANEL_DEFAULT_TEMPLATE_PATH = '@Gui/Panel/panel.twig';

    /**
     * @var string
     */
    protected const LIST_GROUP_DEFAULT_TEMPLATE_PATH = '@Gui/ListGroup/list-group.twig';

    /**
     * @var string
     */
    protected const LIST_GROUP_MULTI_DEFAULT_TEMPLATE_PATH = '@Gui/ListGroup/list-group-multidimensional.twig';

    /**
     * @var string
     */
    protected const SPRYKER_BUILD_HASH = 'SPRYKER_BUILD_HASH';

    protected const string NAVIGATION_ICONS_TYPE_DEFAULT = 'font-awesome';

    protected const string HOME_PATH = '/';

    /**
     * Specification:
     * - Returns the URL the logo links to in the Back Office navigation.
     * - Can be overridden at project level to change the home destination.
     *
     * @api
     *
     * @return string
     */
    public function getUrlHome(): string
    {
        return static::HOME_PATH;
    }

    /**
     * Specification:
     * - Returns the navigation icons type used in the Back Office interface.
     * - Determines which icon library is loaded and rendered in navigation menus.
     * - Supports 'font-awesome' for Font Awesome icons and 'google-material' for Google Material Symbols.
     * - Can be overridden at project level to switch between icon libraries.
     *
     * @api
     *
     * @return string
     */
    public function getNavigationIconsType(): string
    {
        return static::NAVIGATION_ICONS_TYPE_DEFAULT;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getFormResourcesPath(): string
    {
        return __DIR__ . static::FORM_RESOURCES_PATH;
    }

    /**
     * @api
     *
     * @return array<string>
     */
    public function getTemplatePaths(): array
    {
        return [
            $this->getFormResourcesPath(),
        ];
    }

    /**
     * @api
     *
     * @return array<string>
     */
    public function getDefaultTemplateFileNames(): array
    {
        return static::FORM_DEFAULT_TEMPLATE_FILE_NAMES;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getZedAssetsPath(): string
    {
        return $this->get(GuiConstants::ZED_ASSETS_BASE_URL, '/assets/');
    }

    /**
     * @api
     *
     * @return string
     */
    public function getAssetsBuildHash(): string
    {
        return getenv(static::SPRYKER_BUILD_HASH) ?: '';
    }

    /**
     * @api
     *
     * @return string
     */
    public function getTabsDefaultTemplatePath(): string
    {
        return static::TABS_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getSubmitButtonDefaultTemplatePath(): string
    {
        return static::SUBMIT_BUTTON_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getDefaultModalTemplatePath(): string
    {
        return static::MODAL_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getDefaultPanelTemplatePath(): string
    {
        return static::PANEL_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getDefaultListGroupTemplatePath(): string
    {
        return static::LIST_GROUP_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * @api
     *
     * @return string
     */
    public function getDefaultMultiListGroupTemplatePath(): string
    {
        return static::LIST_GROUP_MULTI_DEFAULT_TEMPLATE_PATH;
    }

    /**
     * Specification:
     * - Returns whether `AbstractTable`-based grids skip both the `recordsTotal` and `recordsFiltered`
     *   `COUNT(*)` queries by default, switching to Previous/Next-only pagination instead of page numbers.
     * - `null` (the core default) means adaptive: `AbstractTable` decides per request, based on whether the
     *   query's main table is estimated to be at or above `getLargeTableRowCountThreshold()`.
     * - An explicit `true`/`false` (e.g. a project-level override) always wins and skips the row-count check
     *   entirely — the table is always treated that way, regardless of size.
     * - Individual tables can override this via `TableConfiguration::setUseSimplePagination()`, which always
     *   takes priority over both this project-wide default and the adaptive check.
     *
     * @api
     *
     * @return bool|null
     */
    public function isSimplePaginationEnabledByDefault(): ?bool
    {
        return null;
    }

    /**
     * Specification:
     * - Returns whether the global search box on `AbstractTable`-based grids matches searchable columns with an
     *   exact, case-sensitive comparison by default, instead of a fuzzy `LOWER(column) LIKE '%term%'` comparison.
     * - Speeds up search on large tables: the fuzzy pattern wraps the column in a function and adds a leading
     *   wildcard, so it cannot use a regular index and forces a full table scan; the exact-match pattern can use
     *   existing indexes on the searchable columns.
     * - `null` (the core default) means adaptive: `AbstractTable` decides per request, based on whether the
     *   query's main table is estimated to be at or above `getLargeTableRowCountThreshold()`.
     * - An explicit `true`/`false` (e.g. a project-level override) always wins and skips the row-count check
     *   entirely — the table is always treated that way, regardless of size.
     * - Individual tables can override this via `TableConfiguration::setUseCaseSensitiveSearch()`, which always
     *   takes priority over both this project-wide default and the adaptive check.
     *
     * @api
     *
     * @return bool|null
     */
    public function isCaseSensitiveSearchEnabledByDefault(): ?bool
    {
        return null;
    }

    /**
     * Specification:
     * - Returns whether `AbstractTable`-based grids apply `ORDER BY` to their underlying query by default.
     * - `null` (the core default) means adaptive: `AbstractTable` decides per request, based on whether the
     *   query's main table is estimated to be at or above `getLargeTableRowCountThreshold()` — a
     *   large table gets `ORDER BY` disabled by default instead of enabled.
     * - An explicit `true`/`false` (e.g. a project-level override) always wins and skips the row-count check
     *   entirely — the table is always treated that way, regardless of size.
     * - Individual tables can override this via `TableConfiguration::setUseSorting()`, which always takes
     *   priority over both this project-wide default and the adaptive check.
     *
     * @api
     *
     * @return bool|null
     */
    public function isSortingEnabledByDefault(): ?bool
    {
        return null;
    }

    /**
     * Specification:
     * - Returns the approximate row count above which `AbstractTable` treats a table as "large" for the
     *   adaptive checks described on `isSimplePaginationEnabledByDefault()`, `isCaseSensitiveSearchEnabledByDefault()`,
     *   and `isSortingEnabledByDefault()`.
     * - `null` (the core default) disables the adaptive size check entirely — no table metadata query ever
     *   runs, and every table keeps its existing behavior. Projects that want the adaptive behavior opt in by
     *   overriding this to return a positive row count (e.g. `1_000_000`).
     * - Only consulted when one of the three `is*EnabledByDefault()` methods returns `null` (and the
     *   corresponding `TableConfiguration` setter was not called either) — an explicit `true`/`false` from
     *   either layer skips this check entirely regardless of the threshold.
     *
     * @api
     *
     * @return int|null
     */
    public function getLargeTableRowCountThreshold(): ?int
    {
        return null;
    }
}
