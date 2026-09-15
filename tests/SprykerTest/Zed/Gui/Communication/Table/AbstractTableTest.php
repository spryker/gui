<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication\Table;

use Codeception\Test\Unit;
use PHPUnit\Framework\MockObject\MockObject;
use Propel\Runtime\ActiveQuery\ModelCriteria;
use Propel\Runtime\Collection\ObjectCollection;
use ReflectionMethod;
use Spryker\Zed\Gui\Communication\Exception\TableException;
use Spryker\Zed\Gui\Communication\Table\AbstractTable;
use Spryker\Zed\Gui\Communication\Table\TableConfiguration;
use Spryker\Zed\Gui\GuiConfig;
use SprykerTest\Zed\Gui\Communication\Fixture\ActiveRecord;
use SprykerTest\Zed\Gui\Communication\Fixture\DownloadTable;
use SprykerTest\Zed\Gui\Communication\Fixture\DownloadTableWithOrderedHeadersAndFormatting;
use SprykerTest\Zed\Gui\Communication\Fixture\DownloadTableWithoutGetDownloadQueryMethod;
use SprykerTest\Zed\Gui\Communication\Fixture\FooTable;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Auto-generated group annotations
 *
 * @group SprykerTest
 * @group Zed
 * @group Gui
 * @group Communication
 * @group Table
 * @group AbstractTableTest
 * Add your own group annotations below this line
 */
class AbstractTableTest extends Unit
{
    /**
     * @var string
     */
    protected const OPERATOR_FOR_STRICT_SEARCH = '=';

    /**
     * @var string
     */
    protected const OPERATOR_FOR_FUZZY_SEARCH = 'LIKE';

    /**
     * @var string
     */
    protected const SEARCHABLE_FIELD_NAME = 'spy_customer.first_name';

    /**
     * @var string
     */
    protected const SEARCHABLE_FIELD_KEY = 'FIRST_NAME';

    /**
     * @var string
     */
    public const COL_ONE = 'one';

    /**
     * @var string
     */
    public const COL_TWO = 'two';

    /**
     * @var \Spryker\Zed\Gui\Communication\Table\AbstractTable
     */
    protected $table;

    public function setUp(): void
    {
        parent::setUp();

        $this->table = new FooTable();

        $request = new Request();
        $this->table->setRequest($request);
    }

    public function testGetOrdersDefault(): void
    {
        $config = new TableConfiguration();
        $config->setHeader([
            static::COL_ONE => 'One',
            static::COL_TWO => 'Two',
        ]);
        $config->setSortable([
            static::COL_ONE,
            static::COL_TWO,
        ]);

        $result = $this->table->getOrders($config);
        $expected = [
            [
                'column' => 0,
                'dir' => 'asc',
            ],
        ];
        $this->assertSame($expected, $result);
    }

    public function testGetOrdersWithCustomSortField(): void
    {
        $config = new TableConfiguration();
        $config->setHeader([
            static::COL_ONE => 'One',
            static::COL_TWO => 'Two',
        ]);
        $config->setSortable([
            static::COL_ONE,
            static::COL_TWO,
        ]);

        $config->setDefaultSortField(static::COL_TWO);

        $result = $this->table->getOrders($config);
        $expected = [
            [
              'column' => 1,
              'dir' => 'asc',
            ],
        ];
        $this->assertSame($expected, $result);
    }

    public function testGetOrdersWithCustomSortFieldAndCustomDirection(): void
    {
        $config = new TableConfiguration();
        $config->setHeader([
            static::COL_ONE => 'One',
            static::COL_TWO => 'Two',
        ]);
        $config->setSortable([
            static::COL_ONE,
            static::COL_TWO,
        ]);

        $config->setDefaultSortField(static::COL_TWO, TableConfiguration::SORT_DESC);

        $result = $this->table->getOrders($config);
        $expected = [
            [
                'column' => 1,
                'dir' => 'desc',
            ],
        ];
        $this->assertSame($expected, $result);
    }

    public function testGetOrdersWithDeprecatedIndexAndDirection(): void
    {
        $config = new TableConfiguration();
        $config->setHeader([
            static::COL_ONE => 'One',
            static::COL_TWO => 'Two',
        ]);
        $config->setSortable([
            static::COL_ONE,
            static::COL_TWO,
        ]);

        $config->setDefaultSortColumnIndex(1);
        $config->setDefaultSortDirection(TableConfiguration::SORT_DESC);

        $result = $this->table->getOrders($config);
        $expected = [
            [
                'column' => 1,
                'dir' => 'desc',
            ],
        ];
        $this->assertSame($expected, $result);
    }

    public function testGetCSVHeadersThrowsExceptionWhenMethodNotImplemented(): void
    {
        // Assert
        $this->expectException(TableException::class);
        $this->expectExceptionMessage(sprintf(
            'You need to implement `%s::getCsvHeaders()` in your `%s`',
            AbstractTable::class,
            FooTable::class,
        ));

        // Act
        $this->table->streamDownload();
    }

    public function testGetDownloadQueryThrowsExceptionWhenNotImplemented(): void
    {
        // Arrange
        $table = new DownloadTableWithoutGetDownloadQueryMethod();

        // Assert
        $this->expectException(TableException::class);
        $this->expectExceptionMessage(sprintf(
            'You need to implement `%s::getDownloadQuery()` in your `%s`',
            AbstractTable::class,
            DownloadTableWithoutGetDownloadQueryMethod::class,
        ));

        // Act
        $table->streamDownload()->send();
    }

    public function testStreamDownloadReturnsStreamedResponseWithCSV(): void
    {
        // Arrange
        $table = new DownloadTable();

        // Act
        $streamedResponse = $table->streamDownload();
        ob_start();
        $streamedResponse->send();
        $streamedResponseOutput = ob_get_contents();
        ob_end_clean();

        // Assert
        $this->assertInstanceOf(StreamedResponse::class, $streamedResponse);

        $expectedCsvStreamData = implode(PHP_EOL, [
            '"Header column 1","Header column 2"',
            '"Row 1 column 1","Row 1 column 2"',
            '"Row 2 column 1","Row 2 column 2"',
        ]) . PHP_EOL;

        $this->assertSame($expectedCsvStreamData, $streamedResponseOutput);
    }

    public function testStreamDownloadReturnsStreamedResponseWithOrderedAndFormattedCSV(): void
    {
        // Arrange
        $table = new DownloadTableWithOrderedHeadersAndFormatting();

        // Act
        $streamedResponse = $table->streamDownload();
        ob_start();
        $streamedResponse->send();
        $streamedResponseOutput = ob_get_contents();
        ob_end_clean();

        // Assert
        $this->assertInstanceOf(StreamedResponse::class, $streamedResponse);

        $expectedCsvStreamData = implode(PHP_EOL, [
            '"Header column 1","Header column 2"',
            '"Row 1 column 2","Formatted Row 1 column 1"',
            '"Row 2 column 2","Formatted Row 2 column 1"',
        ]) . PHP_EOL;

        $this->assertSame($expectedCsvStreamData, $streamedResponseOutput);
    }

    public function testRunQueryFiltersDataUsingColumnStrictSearch(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMock();
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => 'maria'],
            'columns' => [
                0 => [
                    'search' => [
                        'value' => 'Maria',
                    ],
                ]],
        ]));

        // Assert
        $modelCriteriaMock->expects($this->any())
            ->method('where')
            ->with($this->stringContains(static::OPERATOR_FOR_STRICT_SEARCH))
            ->willReturn($modelCriteriaMock);

        // Act
        $fooTableMock->fetchData();
    }

    public function testRunQueryUsesFuzzySearchWhenColumnFiltersNotProvided(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMock();
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => 'maria'],
            'columns' => [
                0 => [
                    'search' => [
                        'value' => '',
                    ],
                ],
            ],
        ]));

        // Assert
        $modelCriteriaMock->expects($this->any())
            ->method('where')
            ->with($this->stringContains(static::OPERATOR_FOR_FUZZY_SEARCH))
            ->willReturn($modelCriteriaMock);

        // Act
        $fooTableMock->fetchData();
    }

    public function testRunQueryUsesCaseSensitiveSearchForGlobalSearchBoxWhenEnabled(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMock();
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseCaseSensitiveSearch(true);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => 'maria'],
        ]));

        // Assert
        $modelCriteriaMock->expects($this->any())
            ->method('where')
            ->with($this->stringContains(static::OPERATOR_FOR_STRICT_SEARCH))
            ->willReturn($modelCriteriaMock);

        // Act
        $fooTableMock->fetchData();
    }

    public function testRunQueryTrimsSearchValueWhenCaseSensitiveSearchIsEnabled(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMock();
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseCaseSensitiveSearch(true);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => '  maria  '],
        ]));

        // Assert
        $modelCriteriaMock->expects($this->any())
            ->method('where')
            ->with($this->stringContains("'maria'"))
            ->willReturn($modelCriteriaMock);

        // Act
        $fooTableMock->fetchData();
    }

    public function testNewTableConfigurationUsesCaseSensitiveSearchDefaultFromGuiConfig(): void
    {
        // Arrange
        $guiConfigMock = $this->createMock(GuiConfig::class);
        $guiConfigMock->method('isCaseSensitiveSearchEnabledByDefault')->willReturn(true);

        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['getGuiConfig'])
            ->getMock();
        $fooTableMock->method('getGuiConfig')->willReturn($guiConfigMock);

        // Act
        $config = $this->invokeProtectedMethod($fooTableMock, 'newTableConfiguration');

        // Assert
        $this->assertTrue($config->isCaseSensitiveSearchEnabled());
    }

    public function testRunQuerySkipsCountQueriesAndReportsMoreResultsWhenSimplePaginationFindsExtraRow(): void
    {
        // Arrange
        $limit = 5;
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection($limit + 1));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseSimplePagination(true);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => 'maria'],
        ]));

        $modelCriteriaMock->expects($this->never())
            ->method('count');

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertSame($limit + 1, $modelCriteriaMock->getLimit());
        $this->assertSame($limit + 1, $result['recordsTotal']);
        $this->assertSame($limit + 1, $result['recordsFiltered']);
    }

    public function testRunQuerySkipsCountQueriesAndReportsExactCountOnLastPage(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection(3));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseSimplePagination(true);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'search' => ['value' => 'maria'],
        ]));

        $modelCriteriaMock->expects($this->never())
            ->method('count');

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertSame(3, $result['recordsTotal']);
        $this->assertSame(3, $result['recordsFiltered']);
    }

    public function testRunQuerySkipsCountQueriesEvenWithoutSearchWhenSimplePaginationEnabled(): void
    {
        // Arrange
        $limit = 5;
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection($limit + 1));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseSimplePagination(true);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request());

        $modelCriteriaMock->expects($this->never())
            ->method('count');

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertSame($limit + 1, $modelCriteriaMock->getLimit());
        $this->assertSame($limit + 1, $result['recordsTotal']);
        $this->assertSame($limit + 1, $result['recordsFiltered']);
    }

    public function testRunQueryUsesExactLimitAndCountsWhenSimplePaginationIsDisabled(): void
    {
        // Arrange
        $limit = 5;
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection(3));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request());

        $modelCriteriaMock->expects($this->once())
            ->method('count')
            ->willReturn(99);

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertSame($limit, $modelCriteriaMock->getLimit());
        $this->assertSame(99, $result['recordsTotal']);
    }

    public function testNewTableConfigurationUsesSimplePaginationDefaultFromGuiConfig(): void
    {
        // Arrange
        $guiConfigMock = $this->createMock(GuiConfig::class);
        $guiConfigMock->method('isSimplePaginationEnabledByDefault')->willReturn(true);

        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['getGuiConfig'])
            ->getMock();
        $fooTableMock->method('getGuiConfig')->willReturn($guiConfigMock);

        // Act
        $config = $this->invokeProtectedMethod($fooTableMock, 'newTableConfiguration');

        // Assert
        $this->assertTrue($config->isSimplePaginationEnabled());
    }

    public function testNewTableConfigurationUsesSortingDefaultFromGuiConfig(): void
    {
        // Arrange
        $guiConfigMock = $this->createMock(GuiConfig::class);
        $guiConfigMock->method('isSortingEnabledByDefault')->willReturn(false);

        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['getGuiConfig'])
            ->getMock();
        $fooTableMock->method('getGuiConfig')->willReturn($guiConfigMock);

        // Act
        $config = $this->invokeProtectedMethod($fooTableMock, 'newTableConfiguration');

        // Assert
        $this->assertFalse($config->isSortingEnabled());
    }

    public function testRunQuerySkipsOrderByWhenSortingIsDisabled(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getMockBuilder(ModelCriteria::class)
            ->setConstructorArgs([null, ActiveRecord::class])
            ->onlyMethods(['where', 'find', 'count', 'orderBy'])
            ->getMock();
        $modelCriteriaMock->method('where')->willReturn($modelCriteriaMock);
        $modelCriteriaMock->method('find')->willReturn($this->createActiveRecordCollection(3));

        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseSorting(false);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request());

        // Assert
        $modelCriteriaMock->expects($this->never())
            ->method('orderBy');

        // Act
        $fooTableMock->fetchData();
    }

    public function testRunQueryStillAppliesExplicitClientOrderWhenSortingIsDisabled(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getMockBuilder(ModelCriteria::class)
            ->setConstructorArgs([null, ActiveRecord::class])
            ->onlyMethods(['where', 'find', 'count', 'orderBy'])
            ->getMock();
        $modelCriteriaMock->method('where')->willReturn($modelCriteriaMock);
        $modelCriteriaMock->method('find')->willReturn($this->createActiveRecordCollection(3));
        $modelCriteriaMock->method('orderBy')->willReturn($modelCriteriaMock);

        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setHeader([
            static::COL_ONE => 'One',
            static::COL_TWO => 'Two',
        ]);
        $tableConfigurationMock->setSortable([static::COL_TWO]);
        $tableConfigurationMock->setUseSorting(false);
        $fooTableMock = $this->getFooTableMock($modelCriteriaMock, $tableConfigurationMock);
        $fooTableMock->setRequest(new Request([
            'order' => [0 => ['column' => 1, 'dir' => 'asc']],
        ]));

        // Assert
        $modelCriteriaMock->expects($this->once())
            ->method('orderBy')
            ->with(static::COL_TWO, 'asc');

        // Act
        $fooTableMock->fetchData();
    }

    public function testResolveAdaptiveTableConfigurationEnablesOptimizationsWhenTableIsLargeAndFlagsAreNull(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getMockBuilder(ModelCriteria::class)
            ->setConstructorArgs([null, ActiveRecord::class])
            ->onlyMethods(['where', 'find', 'count', 'orderBy'])
            ->getMock();
        $modelCriteriaMock->method('where')->willReturn($modelCriteriaMock);
        $modelCriteriaMock->method('find')->willReturn($this->createActiveRecordCollection(3));

        $tableConfigurationMock = $this->getTableConfigurationMock();
        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['createQuery', 'init', 'hasLargeMainTable'])
            ->getMock();
        $fooTableMock->method('createQuery')->willReturn($modelCriteriaMock);
        $fooTableMock->method('init')->willReturn($fooTableMock);
        $fooTableMock->method('hasLargeMainTable')->willReturn(true);
        $fooTableMock->setConfiguration($tableConfigurationMock);
        $fooTableMock->setLimit(5);
        $fooTableMock->setRequest(new Request());

        // Assert
        $modelCriteriaMock->expects($this->never())->method('count');
        $modelCriteriaMock->expects($this->never())->method('orderBy');

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertNotNull($result['performanceModeMessage']);
    }

    public function testResolveAdaptiveTableConfigurationSkipsDetectionWhenAllFlagsAreExplicit(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection(3));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $tableConfigurationMock->setUseSimplePagination(false);
        $tableConfigurationMock->setUseCaseSensitiveSearch(false);
        $tableConfigurationMock->setUseSorting(true);

        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['createQuery', 'init', 'hasLargeMainTable'])
            ->getMock();
        $fooTableMock->method('createQuery')->willReturn($modelCriteriaMock);
        $fooTableMock->method('init')->willReturn($fooTableMock);
        $fooTableMock->setConfiguration($tableConfigurationMock);
        $fooTableMock->setLimit(5);
        $fooTableMock->setRequest(new Request());

        // Assert
        $fooTableMock->expects($this->never())->method('hasLargeMainTable');

        // Act
        $fooTableMock->fetchData();
    }

    public function testFetchDataReturnsNullPerformanceModeMessageWhenTableIsNotLarge(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection(3));
        $tableConfigurationMock = $this->getTableConfigurationMock();
        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['createQuery', 'init', 'hasLargeMainTable'])
            ->getMock();
        $fooTableMock->method('createQuery')->willReturn($modelCriteriaMock);
        $fooTableMock->method('init')->willReturn($fooTableMock);
        $fooTableMock->method('hasLargeMainTable')->willReturn(false);
        $fooTableMock->setConfiguration($tableConfigurationMock);
        $fooTableMock->setLimit(5);
        $fooTableMock->setRequest(new Request());

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertNull($result['performanceModeMessage']);
    }

    public function testHasLargeMainTableSkipsDetectionQueryWhenThresholdIsNull(): void
    {
        // Arrange
        $modelCriteriaMock = $this->getModelCriteriaMockWithFindResult($this->createActiveRecordCollection(3));
        $tableConfigurationMock = $this->getTableConfigurationMock();

        $guiConfigMock = $this->createMock(GuiConfig::class);
        $guiConfigMock->method('getLargeTableRowCountThreshold')->willReturn(null);

        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['createQuery', 'init', 'getGuiConfig', 'getApproximateTableRowCounts'])
            ->getMock();
        $fooTableMock->method('createQuery')->willReturn($modelCriteriaMock);
        $fooTableMock->method('init')->willReturn($fooTableMock);
        $fooTableMock->method('getGuiConfig')->willReturn($guiConfigMock);
        $fooTableMock->setConfiguration($tableConfigurationMock);
        $fooTableMock->setLimit(5);
        $fooTableMock->setRequest(new Request());

        // Assert
        $fooTableMock->expects($this->never())->method('getApproximateTableRowCounts');

        // Act
        $result = $fooTableMock->fetchData();

        // Assert
        $this->assertNull($result['performanceModeMessage']);
    }

    public function testColumnSearchIsEnabledWhenSearchableColumnsIsConfigured(): void
    {
        // Arrange
        $config = new TableConfiguration();
        $config->setSearchableColumns([static::SEARCHABLE_FIELD_KEY => static::SEARCHABLE_FIELD_NAME]);

        // Act & Assert
        $this->assertTrue($config->isColumnSearchEnabled());
    }

    public function testColumnSearchIsDisabledWhenSearchableColumnsIsEmpty(): void
    {
        // Arrange
        $config = new TableConfiguration();

        // Act & Assert
        $this->assertFalse($config->isColumnSearchEnabled());
    }

    public function testSetSearchableWithAssociativeArrayAlsoPopulatesSearchableColumns(): void
    {
        // Arrange
        $config = new TableConfiguration();

        // Act
        $config->setSearchable(['NAME' => 'spy_product.name', 'SKU' => 'spy_product.sku']);

        // Assert
        $this->assertSame(['spy_product.name', 'spy_product.sku'], $config->getSearchable());
        $this->assertSame(['NAME' => 'spy_product.name', 'SKU' => 'spy_product.sku'], $config->getSearchableColumns());
    }

    public function testSetSearchableWithPlainListDoesNotPopulateSearchableColumns(): void
    {
        // Arrange
        $config = new TableConfiguration();

        // Act
        $config->setSearchable(['spy_product.name', 'spy_product.sku']);

        // Assert
        $this->assertSame(['spy_product.name', 'spy_product.sku'], $config->getSearchable());
        $this->assertSame([], $config->getSearchableColumns());
    }

    public function testSetSearchableAssociativeEntriesAreMergedWithSetSearchableColumns(): void
    {
        // Arrange
        $config = new TableConfiguration();
        $config->setSearchableColumns(['SKU' => 'spy_product.sku']);

        // Act
        $config->setSearchable(['NAME' => 'spy_product.name']);

        // Assert
        $this->assertSame(
            ['SKU' => 'spy_product.sku', 'NAME' => 'spy_product.name'],
            $config->getSearchableColumns(),
        );
    }

    /**
     * @return \PHPUnit\Framework\MockObject\MockObject|\Propel\Runtime\ActiveQuery\ModelCriteria
     */
    protected function getModelCriteriaMock(): ModelCriteria
    {
        $modelCriteriaMock = $this->getMockBuilder(ModelCriteria::class)
            ->setConstructorArgs([null, ActiveRecord::class])
            ->onlyMethods(['where'])
            ->getMock();

        return $modelCriteriaMock;
    }

    /**
     * @return \PHPUnit\Framework\MockObject\MockObject|\Propel\Runtime\ActiveQuery\ModelCriteria
     */
    protected function getModelCriteriaMockWithFindResult(ObjectCollection $findResult): ModelCriteria
    {
        $modelCriteriaMock = $this->getMockBuilder(ModelCriteria::class)
            ->setConstructorArgs([null, ActiveRecord::class])
            ->onlyMethods(['where', 'find', 'count'])
            ->getMock();

        $modelCriteriaMock->method('where')
            ->willReturn($modelCriteriaMock);
        $modelCriteriaMock->method('find')
            ->willReturn($findResult);

        return $modelCriteriaMock;
    }

    protected function createActiveRecordCollection(int $rowCount): ObjectCollection
    {
        $rows = [];

        for ($i = 0; $i < $rowCount; $i++) {
            $rows[] = new ActiveRecord(['first_name' => sprintf('Row %d', $i)]);
        }

        return new ObjectCollection($rows);
    }

    /**
     * @return mixed
     */
    protected function invokeProtectedMethod(object $object, string $methodName)
    {
        $reflectionMethod = new ReflectionMethod($object, $methodName);
        $reflectionMethod->setAccessible(true);

        return $reflectionMethod->invoke($object);
    }

    /**
     * @return \PHPUnit\Framework\MockObject\MockObject|\Spryker\Zed\Gui\Communication\Table\TableConfiguration
     */
    protected function getTableConfigurationMock(): TableConfiguration
    {
        $tableConfigurationMock = new TableConfiguration();
        $tableConfigurationMock->setSearchableColumns([static::SEARCHABLE_FIELD_KEY => static::SEARCHABLE_FIELD_NAME]);
        $tableConfigurationMock->setDefaultSortColumnIndex(0);
        $tableConfigurationMock->setDefaultSortDirection(TableConfiguration::SORT_ASC);

        return $tableConfigurationMock;
    }

    /**
     * @param \PHPUnit\Framework\MockObject\MockObject $modelCriteriaMock
     * @param \PHPUnit\Framework\MockObject\MockObject $tableConfigurationMock
     *
     * @return \PHPUnit\Framework\MockObject\MockObject|\SprykerTest\Zed\Gui\Communication\Fixture\FooTable
     */
    protected function getFooTableMock(MockObject $modelCriteriaMock, TableConfiguration $tableConfigurationMock): FooTable
    {
        $fooTableMock = $this->getMockBuilder(FooTable::class)
            ->onlyMethods(['createQuery', 'init'])
            ->getMock();
        $fooTableMock->method('createQuery')
            ->willReturn($modelCriteriaMock);
        $fooTableMock->method('init')
            ->willReturn($fooTableMock);
        $fooTableMock->setConfiguration($tableConfigurationMock);
        $fooTableMock->setLimit(5);

        return $fooTableMock;
    }
}
