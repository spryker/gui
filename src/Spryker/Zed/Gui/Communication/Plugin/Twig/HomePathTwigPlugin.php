<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Plugin\Twig;

use Spryker\Service\Container\ContainerInterface;
use Spryker\Shared\TwigExtension\Dependency\Plugin\TwigPluginInterface;
use Spryker\Zed\Kernel\Communication\AbstractPlugin;
use Twig\Environment;

/**
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 */
class HomePathTwigPlugin extends AbstractPlugin implements TwigPluginInterface
{
    protected const string TWIG_GLOBAL_VARIABLE_HOME_PATH = 'homePath';

    /**
     * {@inheritDoc}
     * - Adds `homePath` Twig global variable.
     *
     * @api
     */
    public function extend(Environment $twig, ContainerInterface $container): Environment
    {
        $twig->addGlobal(
            static::TWIG_GLOBAL_VARIABLE_HOME_PATH,
            $this->getConfig()->getUrlHome(),
        );

        return $twig;
    }
}
