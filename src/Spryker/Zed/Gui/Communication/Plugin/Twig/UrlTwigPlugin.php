<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Plugin\Twig;

use Spryker\Service\Container\ContainerInterface;
use Spryker\Service\UtilText\Model\Url\Url;
use Spryker\Shared\TwigExtension\Dependency\Plugin\TwigPluginInterface;
use Spryker\Zed\Kernel\Communication\AbstractPlugin;
use Symfony\Cmf\Component\Routing\ChainRouter;
use Symfony\Component\Routing\Exception\RouteNotFoundException;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Twig\Environment;
use Twig\TwigFunction;

/**
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 */
class UrlTwigPlugin extends AbstractPlugin implements TwigPluginInterface
{
    /**
     * @api
     *
     * @var string
     */
    public const FUNCTION_NAME_URL = 'url';

    /**
     * @var string
     */
    protected const DEFAULT_ENCODING = 'UTF-8';

    /**
     * @uses \Spryker\Zed\Router\Communication\Plugin\Application\RouterApplicationPlugin::SERVICE_ROUTER
     *
     * @var string
     */
    protected const SERVICE_ROUTER = 'routers';

    /**
     * {@inheritDoc}
     * - Extends twig with "url" function to parse and generate URLs based on URL parts.
     *
     * @api
     *
     * @param \Twig\Environment $twig
     * @param \Spryker\Service\Container\ContainerInterface $container
     *
     * @return \Twig\Environment
     */
    public function extend(Environment $twig, ContainerInterface $container): Environment
    {
        $twig->addFunction($this->getUrlFunction($container));

        return $twig;
    }

    protected function getUrlFunction(ContainerInterface $container): TwigFunction
    {
        return new TwigFunction(static::FUNCTION_NAME_URL, function (string $url, array $query = [], array $options = []) use ($container) {
            try {
                if ($container->has(static::SERVICE_ROUTER)) {
                    /** @var \Symfony\Cmf\Component\Routing\ChainRouter $router */
                    $router = $container->get(static::SERVICE_ROUTER);
                    $url = $this->getUrl($router, $url);
                    $referenceType = $this->isWebProfilerRouteName($url) ? UrlGeneratorInterface::ABSOLUTE_URL : UrlGeneratorInterface::ABSOLUTE_PATH;
                    $url = $router->generate($url, $query, $referenceType);

                    $charset = mb_internal_encoding() ?: static::DEFAULT_ENCODING;

                    return htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, $charset);
                }
            } catch (RouteNotFoundException $exception) {
            }

            $url = Url::generate($url, $query, $options);

            return $url->buildEscaped();
        }, ['is_safe' => ['html']]);
    }

    /**
     * WebProfiler's own toolbar JavaScript (`new URL(url)`) requires an absolute URL for these
     * routes, unlike regular Zed navigation, which intentionally stays relative.
     */
    protected function isWebProfilerRouteName(string $routeName): bool
    {
        return $routeName === '_wdt' || str_starts_with($routeName, '_wdt_') || str_starts_with($routeName, '_profiler');
    }

    protected function getUrl(ChainRouter $router, string $url): string
    {
        if (APPLICATION === 'MERCHANT_PORTAL') {
            $route = $router->match($url);
            if (isset($route['_route']) && $route['_route']) {
                $url = (string)$route['_route'];
            }
        }

        return $url;
    }
}
