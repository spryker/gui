<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Filter;

use Twig\TwigFilter;

interface NumberFormatterTwigFilterFactoryInterface
{
    public function createFormatIntFilter(): TwigFilter;

    public function createFormatFloatFilter(): TwigFilter;
}
