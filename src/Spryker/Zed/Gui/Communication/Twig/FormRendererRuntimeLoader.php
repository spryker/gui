<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Twig;

use FilesystemIterator;
use Spryker\Service\Container\ContainerInterface;
use Spryker\Zed\Gui\GuiConfig;
use Symfony\Bridge\Twig\Form\TwigRenderer;
use Symfony\Bridge\Twig\Form\TwigRendererEngine;
use Symfony\Component\Form\FormRenderer;
use Symfony\Component\Form\FormRendererEngineInterface;
use Symfony\Component\Form\FormRendererInterface;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;
use Twig\Environment;
use Twig\RuntimeLoader\FactoryRuntimeLoader;
use Twig\RuntimeLoader\RuntimeLoaderInterface;

class FormRendererRuntimeLoader implements FormRendererRuntimeLoaderInterface
{
    protected const string SERVICE_FORM_CSRF_PROVIDER = 'form.csrf_provider';

    public function __construct(protected GuiConfig $config)
    {
    }

    public function createRuntimeLoader(Environment $twig, ContainerInterface $container): RuntimeLoaderInterface
    {
        $formRendererCallback = function () use ($twig, $container): FormRendererInterface {
            if ($container->has(static::SERVICE_FORM_CSRF_PROVIDER)) {
                return $this->createFormRenderer($twig, $container->get(static::SERVICE_FORM_CSRF_PROVIDER));
            }

            return $this->createFormRenderer($twig);
        };

        $loadersMap = [FormRenderer::class => $formRendererCallback];

        if (class_exists(TwigRenderer::class)) {
            $loadersMap[TwigRenderer::class] = $formRendererCallback;
        }

        return new FactoryRuntimeLoader($loadersMap);
    }

    protected function createFormRenderer(Environment $twig, ?CsrfTokenManagerInterface $csrfTokenManager = null): FormRendererInterface
    {
        return new FormRenderer($this->createTwigRendererEngine($twig), $csrfTokenManager);
    }

    protected function createTwigRendererEngine(Environment $twig): FormRendererEngineInterface
    {
        return new TwigRendererEngine($this->getTemplateFileNames(), $twig);
    }

    /**
     * @return array<string>
     */
    protected function getTemplateFileNames(): array
    {
        $files = new FilesystemIterator(
            $this->config->getFormResourcesPath(),
            FilesystemIterator::SKIP_DOTS | FilesystemIterator::KEY_AS_PATHNAME,
        );

        $typeTemplates = $this->config->getDefaultTemplateFileNames();

        /** @var \SplFileInfo $file */
        foreach ($files as $file) {
            $typeTemplates[] = $file->getFilename();
        }

        return $typeTemplates;
    }
}
