<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Extender;

use Spryker\Zed\Gui\Communication\Filter\NumberFormatterTwigFilterFactoryInterface;
use Twig\Environment;

class NumberFormatterTwigFilterExtender implements NumberFormatterTwigFilterExtenderInterface
{
    /**
     * @var \Spryker\Zed\Gui\Communication\Filter\NumberFormatterTwigFilterFactoryInterface
     */
    protected NumberFormatterTwigFilterFactoryInterface $numberFormatterTwigFilterFactory;

    public function __construct(NumberFormatterTwigFilterFactoryInterface $numberFormatterTwigFilterFactory)
    {
        $this->numberFormatterTwigFilterFactory = $numberFormatterTwigFilterFactory;
    }

    public function extend(Environment $twig): Environment
    {
        $twig->addFilter($this->numberFormatterTwigFilterFactory->createFormatIntFilter());
        $twig->addFilter($this->numberFormatterTwigFilterFactory->createFormatFloatFilter());

        return $twig;
    }
}
