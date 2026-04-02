<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Twig;

use Spryker\Service\Container\ContainerInterface;
use Twig\Environment;
use Twig\RuntimeLoader\RuntimeLoaderInterface;

interface FormRendererRuntimeLoaderInterface
{
    public function createRuntimeLoader(Environment $twig, ContainerInterface $container): RuntimeLoaderInterface;
}
