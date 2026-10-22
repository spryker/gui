<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication\Fixture;

use Generated\Shared\Transfer\ActionConfirmationTransfer;
use Symfony\Contracts\Translation\TranslatorInterface;

class ConfirmationActionTable extends FooTable
{
    public function __construct(protected ?TranslatorInterface $translator)
    {
    }

    /**
     * @return array<string, string>
     */
    public function buildConfirmationAttributes(ActionConfirmationTransfer $actionConfirmationTransfer): array
    {
        return parent::buildConfirmationAttributes($actionConfirmationTransfer);
    }

    protected function getTranslator(): ?TranslatorInterface
    {
        return $this->translator;
    }
}
