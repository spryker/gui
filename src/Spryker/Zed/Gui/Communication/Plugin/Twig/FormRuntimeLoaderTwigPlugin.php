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
class FormRuntimeLoaderTwigPlugin extends AbstractPlugin implements TwigPluginInterface
{
    /**
     * {@inheritDoc}
     * Specification:
     * - Adds a form renderer runtime loader to the Twig environment via FormRendererRuntimeLoader.
     * - Maps FormRenderer::class (and TwigRenderer::class when available) to a lazy factory callback.
     * - Injects the CSRF token manager from the container when available under 'form.csrf_provider'.
     *
     * @api
     */
    public function extend(Environment $twig, ContainerInterface $container): Environment
    {
        $twig->addRuntimeLoader($this->getFactory()->createFormRendererRuntimeLoader()->createRuntimeLoader($twig, $container));

        return $twig;
    }
}
