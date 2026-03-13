<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\NavigationLink;

use Generated\Shared\Transfer\LinkTransfer;
use Twig\Environment;

class NavigationLinkGenerator implements NavigationLinkGeneratorInterface
{
    /**
     * @param array<\Spryker\Shared\GuiExtension\Dependency\Plugin\NavigationPluginInterface> $navigationPlugins
     */
    public function __construct(protected array $navigationPlugins)
    {
    }

    public function generateNavigationItems(Environment $twig): string
    {
        $navigationItems = [];

        foreach ($this->navigationPlugins as $navigationPlugin) {
            $linkTransfer = $navigationPlugin->getNavigationItem();
            if (!$this->isValidLinkTransfer($linkTransfer)) {
                continue;
            }

            $navigationItems[] = $this->generateNavigationItem($linkTransfer, $twig);
        }

        return implode(PHP_EOL, $navigationItems);
    }

    protected function generateNavigationItem(LinkTransfer $linkTransfer, Environment $twig): string
    {
        $attributes = '';
        foreach ($linkTransfer->getAttributes() as $key => $value) {
            $attributes .= sprintf(' %s="%s"', $key, htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
        }

        $template = $twig->createTemplate(
            '<a class="dropdown-item" href="{{ url }}"{{ attributes | raw }}>{{ label | trans }}</a>',
        );

        return $template->render([
            'url' => $linkTransfer->getUrl(),
            'attributes' => $attributes,
            'label' => $linkTransfer->getLabel(),
        ]);
    }

    protected function isValidLinkTransfer(?LinkTransfer $linkTransfer): bool
    {
        return $linkTransfer !== null && $linkTransfer->getUrl() !== null && $linkTransfer->getLabel() !== null;
    }
}
