<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Form\Type;

use Symfony\Component\Form\Extension\Core\Type\DateType;

/**
 * Standard Back Office date field. Use `range_group` and `range_role` to link two fields into a
 * validity range instead of wiring the bounds by hand.
 *
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 */
class DatePickerType extends AbstractDatePickerType
{
    protected const string PICKER_TYPE = 'date';

    protected const string DEFAULT_FORMAT = 'yyyy-MM-dd';

    protected const string BLOCK_PREFIX = 'spryker_date_picker';

    protected function getPickerType(): string
    {
        return static::PICKER_TYPE;
    }

    protected function getDefaultFormat(): string
    {
        return static::DEFAULT_FORMAT;
    }

    public function getParent(): string
    {
        return DateType::class;
    }

    public function getBlockPrefix(): string
    {
        return static::BLOCK_PREFIX;
    }
}
