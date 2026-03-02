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
class EditTableButtonTwigPlugin extends AbstractButtonTwig
{
    protected function getFunctionName(): string
    {
        return 'editTableButton';
    }

    protected function getButtonClass(): string
    {
        return 'btn-edit';
    }

    protected function getIcon(): string
    {
        return '<i class="fa fa-edit"></i> ';
    }

    protected function getButtonDefaultClass(): string
    {
        return 'btn-xs btn-outline';
    }
}
