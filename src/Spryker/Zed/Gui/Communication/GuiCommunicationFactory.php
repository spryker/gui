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
    /**
     * @return \Spryker\Shared\Twig\Loader\FilesystemLoaderInterface
     */
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

    /**
     * @return \Symfony\Component\Form\FormTypeExtensionInterface
     */
    public function createNoValidateFormTypeExtension(): FormTypeExtensionInterface
    {
        return new NoValidateTypeExtension();
    }

    /**
     * @return \Symfony\Component\Form\FormTypeExtensionInterface
     */
    public function createSanitizeXssTypeExtension(): FormTypeExtensionInterface
    {
        return new SanitizeXssTypeExtension($this->getUtilSanitizeXssService());
    }

    /**
     * @return \Spryker\Zed\Gui\Communication\Extender\NumberFormatterTwigFilterExtenderInterface
     */
    public function createNumberFormatterTwigFilterExtender(): NumberFormatterTwigFilterExtenderInterface
    {
        return new NumberFormatterTwigFilterExtender(
            $this->createNumberFormatterTwigFilterFactory(),
        );
    }

    /**
     * @return \Spryker\Zed\Gui\Communication\Filter\NumberFormatterTwigFilterFactoryInterface
     */
    public function createNumberFormatterTwigFilterFactory(): NumberFormatterTwigFilterFactoryInterface
    {
        return new NumberFormatterTwigFilterFactory(
            $this->getUtilNumberService(),
        );
    }

    /**
     * @return \Spryker\Zed\Gui\Dependency\Service\GuiToUtilSanitizeXssServiceInterface
     */
    public function getUtilSanitizeXssService(): GuiToUtilSanitizeXssServiceInterface
    {
        return $this->getProvidedDependency(GuiDependencyProvider::SERVICE_UTIL_SANITIZE_XSS);
    }

    /**
     * @return \Spryker\Zed\Gui\Dependency\Service\GuiToUtilNumberServiceInterface
     */
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

    /**
     * @return \Spryker\Zed\Gui\Communication\NavigationLink\NavigationLinkGeneratorInterface
     */
    public function createNavigationLinkGenerator(): NavigationLinkGeneratorInterface
    {
        return new NavigationLinkGenerator(
            $this->getNavigationPlugins(),
        );
    }
}
