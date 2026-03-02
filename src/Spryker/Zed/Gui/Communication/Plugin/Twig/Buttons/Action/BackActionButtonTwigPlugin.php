<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Plugin\Twig\Buttons\Action;

use Spryker\Zed\Gui\Communication\Plugin\Twig\Buttons\AbstractButtonTwig;

/**
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 */
class BackActionButtonTwigPlugin extends AbstractButtonTwig
{
    protected function getFunctionName(): string
    {
        return 'backActionButton';
    }

    protected function getButtonClass(): string
    {
        return 'btn-back';
    }

    protected function getIcon(): string
    {
        return '<i class="fa fa-angle-left"></i> ';
    }

    protected function getButtonDefaultClass(): string
    {
        return 'btn-sm btn-view btn-outline';
    }
}
