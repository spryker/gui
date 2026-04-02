<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication\Plugin\Twig;

use Codeception\Test\Unit;
use Spryker\Service\Container\ContainerInterface;
use Spryker\Zed\Gui\Communication\Plugin\Twig\FormRuntimeLoaderTwigPlugin;
use Spryker\Zed\Gui\Communication\Twig\FormRendererRuntimeLoader;
use Spryker\Zed\Gui\GuiConfig;
use SprykerTest\Zed\Gui\GuiCommunicationTester;
use Symfony\Component\Form\FormRenderer;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
use Twig\Environment;
use Twig\RuntimeLoader\RuntimeLoaderInterface;

/**
 * Auto-generated group annotations
 *
 * @group SprykerTest
 * @group Zed
 * @group Gui
 * @group Communication
 * @group Plugin
 * @group Twig
 * @group FormRuntimeLoaderTwigPluginTest
 * Add your own group annotations below this line
 */
class FormRuntimeLoaderTwigPluginTest extends Unit
{
    protected GuiCommunicationTester $tester;

    public function testExtendShouldAddRuntimeLoaderToTwig(): void
    {
        // Arrange
        $plugin = new FormRuntimeLoaderTwigPlugin();
        $plugin->setFactory($this->tester->getFactory());

        $twigMock = $this->createMock(Environment::class);
        $containerMock = $this->createMock(ContainerInterface::class);

        // Expect
        $twigMock->expects($this->once())
            ->method('addRuntimeLoader')
            ->with($this->isInstanceOf(RuntimeLoaderInterface::class));

        // Act
        $plugin->extend($twigMock, $containerMock);
    }

    public function testExtendShouldReturnTwigEnvironment(): void
    {
        // Arrange
        $plugin = new FormRuntimeLoaderTwigPlugin();
        $plugin->setFactory($this->tester->getFactory());

        $twigMock = $this->createMock(Environment::class);
        $containerMock = $this->createMock(ContainerInterface::class);

        // Act
        $result = $plugin->extend($twigMock, $containerMock);

        // Assert
        $this->assertSame($twigMock, $result);
    }

    public function testCreateRuntimeLoaderShouldReturnRuntimeLoaderInterface(): void
    {
        // Arrange
        $formRendererRuntimeLoader = $this->createFormRendererRuntimeLoader();

        // Act
        $result = $formRendererRuntimeLoader->createRuntimeLoader(
            $this->createMock(Environment::class),
            $this->createMock(ContainerInterface::class),
        );

        // Assert
        $this->assertInstanceOf(RuntimeLoaderInterface::class, $result);
    }

    public function testCreateRuntimeLoaderShouldProvideFormRendererWhenCsrfTokenProviderIsAvailable(): void
    {
        // Arrange
        $formRendererRuntimeLoader = $this->createFormRendererRuntimeLoader();
        $csrfTokenManagerMock = $this->createMock(CsrfTokenManagerInterface::class);

        $containerMock = $this->createMock(ContainerInterface::class);
        $containerMock->method('has')->with('form.csrf_provider')->willReturn(true);
        $containerMock->expects($this->once())
            ->method('get')
            ->with('form.csrf_provider')
            ->willReturn($csrfTokenManagerMock);

        $runtimeLoader = $formRendererRuntimeLoader->createRuntimeLoader(
            $this->createMock(Environment::class),
            $containerMock,
        );

        // Act
        $result = $runtimeLoader->load(FormRenderer::class);

        // Assert
        $this->assertInstanceOf(FormRenderer::class, $result);
    }

    public function testCreateRuntimeLoaderShouldProvideFormRendererWhenCsrfTokenProviderIsNotAvailable(): void
    {
        // Arrange
        $formRendererRuntimeLoader = $this->createFormRendererRuntimeLoader();

        $containerMock = $this->createMock(ContainerInterface::class);
        $containerMock->method('has')->willReturn(false);
        $containerMock->expects($this->never())->method('get');

        $runtimeLoader = $formRendererRuntimeLoader->createRuntimeLoader(
            $this->createMock(Environment::class),
            $containerMock,
        );

        // Act
        $result = $runtimeLoader->load(FormRenderer::class);

        // Assert
        $this->assertInstanceOf(FormRenderer::class, $result);
    }

    public function testCreateRuntimeLoaderShouldReturnNullForUnknownClass(): void
    {
        // Arrange
        $formRendererRuntimeLoader = $this->createFormRendererRuntimeLoader();

        $runtimeLoader = $formRendererRuntimeLoader->createRuntimeLoader(
            $this->createMock(Environment::class),
            $this->createMock(ContainerInterface::class),
        );

        // Act
        $result = $runtimeLoader->load('Unknown\Class');

        // Assert
        $this->assertNull($result);
    }

    protected function createFormRendererRuntimeLoader(): FormRendererRuntimeLoader
    {
        $configMock = $this->createMock(GuiConfig::class);
        $configMock->method('getFormResourcesPath')->willReturn(sys_get_temp_dir());
        $configMock->method('getDefaultTemplateFileNames')->willReturn([]);

        return new FormRendererRuntimeLoader($configMock);
    }
}
