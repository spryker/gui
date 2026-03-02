<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Plugin\Twig\Buttons\Table;

use Spryker\Zed\Gui\Communication\Plugin\Twig\Buttons\AbstractButtonTwig;

/**
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 */
class CreateTableButtonTwigPlugin extends AbstractButtonTwig
{
    protected function getFunctionName(): string
    {
        return 'createTableButton';
    }

    protected function getButtonClass(): string
    {
        return 'btn-create';
    }

    protected function getIcon(): string
    {
        return '<i class="fa fa-plus"></i> ';
    }

    protected function getButtonDefaultClass(): string
    {
        return 'btn-xs btn-outline';
    }
}
