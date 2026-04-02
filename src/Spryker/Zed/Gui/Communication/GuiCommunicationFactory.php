<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication;

use Spryker\Shared\Twig\Loader\FilesystemLoader;
use Spryker\Shared\Twig\Loader\FilesystemLoaderInterface;
use Spryker\Zed\Gui\Communication\Extender\NumberFormatterTwigFilterExtender;
use Spryker\Zed\Gui\Communication\Extender\NumberFormatterTwigFilterExtenderInterface;
use Spryker\Zed\Gui\Communication\Filter\NumberFormatterTwigFilterFactory;
use Spryker\Zed\Gui\Communication\Filter\NumberFormatterTwigFilterFactoryInterface;
use Spryker\Zed\Gui\Communication\Form\Type\Extension\NoValidateTypeExtension;
use Spryker\Zed\Gui\Communication\Form\Type\Extension\SanitizeXssTypeExtension;
use Spryker\Zed\Gui\Communication\NavigationLink\NavigationLinkGenerator;
use Spryker\Zed\Gui\Communication\NavigationLink\NavigationLinkGeneratorInterface;
use Spryker\Zed\Gui\Communication\Twig\FormRendererRuntimeLoader;
use Spryker\Zed\Gui\Communication\Twig\FormRendererRuntimeLoaderInterface;
use Spryker\Zed\Gui\Dependency\Service\GuiToUtilNumberServiceInterface;
use Spryker\Zed\Gui\Dependency\Service\GuiToUtilSanitizeXssServiceInterface;
use Spryker\Zed\Gui\GuiDependencyProvider;
use Spryker\Zed\Kernel\Communication\AbstractCommunicationFactory;
use Symfony\Component\Form\FormTypeExtensionInterface;

/**
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 */
class GuiCommunicationFactory extends AbstractCommunicationFactory
{
    public function createFilesystemLoader(): FilesystemLoaderInterface
    {
        return new FilesystemLoader($this->getConfig()->getTemplatePaths());
    }

    /**
     * @return array<\Twig\TwigFilter>
     */
    public function getTwigFilters(): array
    {
        return $this->getProvidedDependency(GuiDependencyProvider::GUI_TWIG_FILTERS);
    }

    public function createNoValidateFormTypeExtension(): FormTypeExtensionInterface
    {
        return new NoValidateTypeExtension();
    }

    public function createSanitizeXssTypeExtension(): FormTypeExtensionInterface
    {
        return new SanitizeXssTypeExtension($this->getUtilSanitizeXssService());
    }

    public function createNumberFormatterTwigFilterExtender(): NumberFormatterTwigFilterExtenderInterface
    {
        return new NumberFormatterTwigFilterExtender(
            $this->createNumberFormatterTwigFilterFactory(),
        );
    }

    public function createNumberFormatterTwigFilterFactory(): NumberFormatterTwigFilterFactoryInterface
    {
        return new NumberFormatterTwigFilterFactory(
            $this->getUtilNumberService(),
        );
    }

    public function getUtilSanitizeXssService(): GuiToUtilSanitizeXssServiceInterface
    {
        return $this->getProvidedDependency(GuiDependencyProvider::SERVICE_UTIL_SANITIZE_XSS);
    }

    public function getUtilNumberService(): GuiToUtilNumberServiceInterface
    {
        return $this->getProvidedDependency(GuiDependencyProvider::SERVICE_UTIL_NUMBER);
    }

    /**
     * @return array<\Spryker\Shared\GuiExtension\Dependency\Plugin\NavigationPluginInterface>
     */
    public function getNavigationPlugins(): array
    {
        return $this->getProvidedDependency(GuiDependencyProvider::PLUGINS_DROPDOWN_NAVIGATION);
    }

    public function createNavigationLinkGenerator(): NavigationLinkGeneratorInterface
    {
        return new NavigationLinkGenerator(
            $this->getNavigationPlugins(),
        );
    }

    public function createFormRendererRuntimeLoader(): FormRendererRuntimeLoaderInterface
    {
        return new FormRendererRuntimeLoader($this->getConfig());
    }
}
