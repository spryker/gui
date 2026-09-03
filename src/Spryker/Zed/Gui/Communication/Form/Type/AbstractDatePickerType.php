<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Form\Type;

use Spryker\Zed\Kernel\Communication\Form\AbstractType;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Base type for the standard Back Office date/time pickers.
 *
 * Renders a text input carrying its configuration as JSON in the `data-spryker-picker` attribute,
 * which the Gui `DateTimePicker` translates into picker options. Modules therefore declare intent
 * through form type options instead of shipping their own picker initialization JavaScript.
 *
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 */
abstract class AbstractDatePickerType extends AbstractType
{
    protected const string OPTION_ALT_FORMAT = 'alt_format';

    protected const string OPTION_MIN_DATE = 'min_date';

    protected const string OPTION_MAX_DATE = 'max_date';

    protected const string OPTION_RANGE_GROUP = 'range_group';

    protected const string OPTION_RANGE_ROLE = 'range_role';

    protected const string OPTION_MINUTE_INCREMENT = 'minute_increment';

    protected const string OPTION_WIDGET = 'widget';

    protected const string OPTION_HTML5 = 'html5';

    protected const string OPTION_FORMAT = 'format';

    protected const string OPTION_ATTR = 'attr';

    protected const string WIDGET_SINGLE_TEXT = 'single_text';

    public const string RANGE_ROLE_START = 'start';

    public const string RANGE_ROLE_END = 'end';

    /**
     * Relative bound accepted by the picker for `min_date`/`max_date`.
     */
    public const string DATE_TODAY = 'today';

    /**
     * Single attribute holding the JSON configuration read by the Gui `DateTimePicker`.
     */
    protected const string ATTRIBUTE_PICKER = 'data-spryker-picker';

    protected const string ATTRIBUTE_PLACEHOLDER = 'placeholder';

    /**
     * Uppercased counterparts of the ICU tokens, so the placeholder reads as a format hint
     * (`YYYY-MM-DD`) rather than as the pattern the value transformer works with (`yyyy-MM-dd`).
     * Minutes stay lowercase to remain distinguishable from months.
     *
     * @var array<string, string>
     */
    protected const array PLACEHOLDER_TOKEN_MAP = [
        'yyyy' => 'YYYY',
        'yy' => 'YY',
        'MM' => 'MM',
        'dd' => 'DD',
        'HH' => 'HH',
        'mm' => 'mm',
        'ss' => 'SS',
    ];

    protected const string CONFIG_KEY_TYPE = 'type';

    protected const string CONFIG_KEY_DATE_FORMAT = 'dateFormat';

    /**
     * Picker type written into the `type` key of the picker configuration.
     */
    abstract protected function getPickerType(): string;

    /**
     * Format used for both the submitted value and the picker when none is given explicitly.
     */
    abstract protected function getDefaultFormat(): string;

    /**
     * @param \Symfony\Component\Form\FormView $view
     * @param \Symfony\Component\Form\FormInterface $form
     * @param array<string, mixed> $options
     *
     * @return void
     */
    public function buildView(FormView $view, FormInterface $form, array $options): void
    {
        $view->vars[static::OPTION_ATTR] = array_merge(
            // The field accepts typed input as well as picker selection, so the accepted format is
            // shown instead of being left to guessing. A form can still supply its own placeholder.
            [static::ATTRIBUTE_PLACEHOLDER => $this->buildPlaceholder($options)],
            $view->vars[static::OPTION_ATTR] ?? [],
            [static::ATTRIBUTE_PICKER => $this->encodePickerConfig($options)],
        );
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        parent::configureOptions($resolver);

        $resolver->setDefaults([
            // The picker replaces the browser control, so the field must render as a plain text input.
            static::OPTION_WIDGET => static::WIDGET_SINGLE_TEXT,
            static::OPTION_HTML5 => false,
            static::OPTION_FORMAT => $this->getDefaultFormat(),
            static::OPTION_ALT_FORMAT => null,
            static::OPTION_MIN_DATE => null,
            static::OPTION_MAX_DATE => null,
            static::OPTION_RANGE_GROUP => null,
            static::OPTION_RANGE_ROLE => null,
            static::OPTION_MINUTE_INCREMENT => null,
        ]);

        $resolver->setAllowedTypes(static::OPTION_ALT_FORMAT, ['string', 'null']);
        $resolver->setAllowedTypes(static::OPTION_MIN_DATE, ['string', 'null']);
        $resolver->setAllowedTypes(static::OPTION_MAX_DATE, ['string', 'null']);
        $resolver->setAllowedTypes(static::OPTION_RANGE_GROUP, ['string', 'null']);
        $resolver->setAllowedTypes(static::OPTION_MINUTE_INCREMENT, ['int', 'null']);
        $resolver->setAllowedValues(static::OPTION_RANGE_ROLE, [
            null,
            static::RANGE_ROLE_START,
            static::RANGE_ROLE_END,
        ]);
    }

    /**
     * @param array<string, mixed> $options
     */
    protected function encodePickerConfig(array $options): ?string
    {
        return $this->getFactory()->getUtilEncodingService()->encodeJson($this->buildPickerConfig($options));
    }

    /**
     * @param array<string, mixed> $options
     *
     * @return array<string, mixed>
     */
    protected function buildPickerConfig(array $options): array
    {
        $pickerConfig = [
            static::CONFIG_KEY_TYPE => $this->getPickerType(),
            $this->buildConfigKey(static::OPTION_FORMAT) => $this->convertToPickerFormat($options[static::OPTION_FORMAT]),
        ];

        foreach ($this->getPickerOptionNames() as $optionName) {
            if ($options[$optionName] === null) {
                continue;
            }

            $value = $options[$optionName];

            // `alt_format` is a display format like `format`, so it needs the same ICU-to-picker
            // token conversion instead of being forwarded to the picker library as-is.
            if ($optionName === static::OPTION_ALT_FORMAT) {
                $value = $this->convertToPickerFormat($value);
            }

            $pickerConfig[$this->buildConfigKey($optionName)] = $value;
        }

        return $pickerConfig;
    }

    /**
     * Options forwarded to the picker as configuration. Extending types add their own option here;
     * no configuration key has to be declared alongside it.
     *
     * @return array<string>
     */
    protected function getPickerOptionNames(): array
    {
        return [
            static::OPTION_ALT_FORMAT,
            static::OPTION_MIN_DATE,
            static::OPTION_MAX_DATE,
            static::OPTION_RANGE_GROUP,
            static::OPTION_RANGE_ROLE,
            static::OPTION_MINUTE_INCREMENT,
        ];
    }

    /**
     * Configuration keys are the camel case form of the option names, which is also how the picker
     * library names its own options, so `min_date` needs no translation to reach it as `minDate`.
     */
    protected function buildConfigKey(string $optionName): string
    {
        return $this->getPickerConfigKeyMap()[$optionName]
            ?? lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $optionName))));
    }

    /**
     * Options whose name cannot follow the picker library because Symfony owns it: `format` belongs
     * to the parent type, which uses it for the value transformer, while the picker calls the same
     * setting `dateFormat`.
     *
     * @return array<string, string>
     */
    protected function getPickerConfigKeyMap(): array
    {
        return [
            static::OPTION_FORMAT => static::CONFIG_KEY_DATE_FORMAT,
        ];
    }

    /**
     * Placeholder hinting the format the field accepts when typed into. It is derived from the
     * format actually shown to the user: `alt_format` when the picker displays an alternate input,
     * the submitted `format` otherwise. A field overriding either therefore needs no own placeholder.
     *
     * @param array<string, mixed> $options
     */
    protected function buildPlaceholder(array $options): string
    {
        $format = $options[static::OPTION_ALT_FORMAT] ?? null;

        if ($format === null) {
            $format = $options[static::OPTION_FORMAT];
        }

        return strtr($format, static::PLACEHOLDER_TOKEN_MAP);
    }

    /**
     * Symfony formats dates with ICU patterns while the picker uses its own tokens, so the
     * configured `format` is translated instead of being duplicated per field.
     */
    protected function convertToPickerFormat(string $format): string
    {
        return strtr($format, $this->getFormatConversionMap());
    }

    /**
     * @return array<string, string>
     */
    protected function getFormatConversionMap(): array
    {
        return [
            'yyyy' => 'Y',
            'yy' => 'y',
            'MM' => 'm',
            'dd' => 'd',
            'HH' => 'H',
            'mm' => 'i',
            'ss' => 'S',
        ];
    }
}
