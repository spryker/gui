<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication\Fixture;

use LogicException;
use Spryker\Zed\Gui\Communication\Table\AbstractTable;
use Spryker\Zed\Gui\Communication\Table\TableConfiguration;
use Symfony\Component\HttpFoundation\Request;

class FooTable extends AbstractTable
{
    protected function configure(TableConfiguration $config): TableConfiguration
    {
        return new TableConfiguration();
    }

    protected function prepareData(TableConfiguration $config): array
    {
        $this->runQuery($this->createQuery(), $config);

        return [];
    }

    /**
     * @throws \LogicException
     *
     * @return void
     */
    protected function createQuery()
    {
        throw new LogicException('Method should be mocked.');
    }

    public function setRequest(Request $request): void
    {
        $this->request = $request;
    }

    public function getRequest(): Request
    {
        return $this->request;
    }
}
