<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace Spryker\Zed\Gui\Communication\Form\Type;

use Spryker\Zed\Kernel\Communication\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Standard Back Office rich-text (HTML) field.
 *
 * Renders a textarea carrying its configuration as JSON in the `data-spryker-rich-text-editor` attribute,
 * which the Gui rich-text editor reads when it mounts. Modules therefore declare the editor in their form
 * types instead of marking a textarea for client-side discovery.
 *
 * Use `editor_config` to name the feature profile that modules register editor features for (e.g. `cms`),
 * and `toolbar` to limit the built-in toolbar to a subset of `SUPPORTED_TOOLBAR_ITEMS`.
 *
 * @method \Spryker\Zed\Gui\Communication\GuiCommunicationFactory getFactory()
 * @method \Spryker\Zed\Gui\GuiConfig getConfig()
 */
class RichTextEditorType extends AbstractType
{
    public const string TOOLBAR_ITEM_STYLE = 'style';

    public const string TOOLBAR_ITEM_BOLD = 'bold';

    public const string TOOLBAR_ITEM_ITALIC = 'italic';

    public const string TOOLBAR_ITEM_UNDERLINE = 'underline';

    public const string TOOLBAR_ITEM_CLEAR = 'clear';

    public const string TOOLBAR_ITEM_STRIKETHROUGH = 'strikethrough';

    public const string TOOLBAR_ITEM_SUPERSCRIPT = 'superscript';

    public const string TOOLBAR_ITEM_SUBSCRIPT = 'subscript';

    public const string TOOLBAR_ITEM_FONT_SIZE = 'fontsize';

    public const string TOOLBAR_ITEM_COLOR = 'color';

    public const string TOOLBAR_ITEM_BACKGROUND_COLOR = 'background-color';

    public const string TOOLBAR_ITEM_BULLET_LIST = 'ul';

    public const string TOOLBAR_ITEM_ORDERED_LIST = 'ol';

    public const string TOOLBAR_ITEM_PARAGRAPH = 'paragraph';

    public const string TOOLBAR_ITEM_PICTURE = 'picture';

    public const string TOOLBAR_ITEM_LINK = 'link';

    public const string TOOLBAR_ITEM_VIDEO = 'video';

    public const string TOOLBAR_ITEM_TABLE = 'table';

    public const string TOOLBAR_ITEM_HORIZONTAL_RULE = 'hr';

    public const string TOOLBAR_ITEM_UNDO = 'undo';

    public const string TOOLBAR_ITEM_REDO = 'redo';

    public const string TOOLBAR_ITEM_FULLSCREEN = 'fullscreen';

    public const string TOOLBAR_ITEM_SOURCE = 'codeview';

    /**
     * The built-in toolbar items in display order. The rich-text editor's JavaScript toolbar is asserted to
     * offer exactly these items.
     *
     * @var list<string>
     */
    public const array SUPPORTED_TOOLBAR_ITEMS = [
        self::TOOLBAR_ITEM_STYLE,
        self::TOOLBAR_ITEM_BOLD,
        self::TOOLBAR_ITEM_ITALIC,
        self::TOOLBAR_ITEM_UNDERLINE,
        self::TOOLBAR_ITEM_CLEAR,
        self::TOOLBAR_ITEM_STRIKETHROUGH,
        self::TOOLBAR_ITEM_SUPERSCRIPT,
        self::TOOLBAR_ITEM_SUBSCRIPT,
        self::TOOLBAR_ITEM_FONT_SIZE,
        self::TOOLBAR_ITEM_COLOR,
        self::TOOLBAR_ITEM_BACKGROUND_COLOR,
        self::TOOLBAR_ITEM_BULLET_LIST,
        self::TOOLBAR_ITEM_ORDERED_LIST,
        self::TOOLBAR_ITEM_PARAGRAPH,
        self::TOOLBAR_ITEM_PICTURE,
        self::TOOLBAR_ITEM_LINK,
        self::TOOLBAR_ITEM_VIDEO,
        self::TOOLBAR_ITEM_TABLE,
        self::TOOLBAR_ITEM_HORIZONTAL_RULE,
        self::TOOLBAR_ITEM_UNDO,
        self::TOOLBAR_ITEM_REDO,
        self::TOOLBAR_ITEM_FULLSCREEN,
        self::TOOLBAR_ITEM_SOURCE,
    ];

    protected const string OPTION_EDITOR_CONFIG = 'editor_config';

    protected const string OPTION_TOOLBAR = 'toolbar';

    protected const string OPTION_ATTR = 'attr';

    /**
     * Single attribute holding the JSON configuration read by the Gui rich-text editor.
     */
    protected const string ATTRIBUTE_EDITOR = 'data-spryker-rich-text-editor';

    protected const string CONFIG_KEY_EDITOR_CONFIG = 'editorConfig';

    protected const string CONFIG_KEY_TOOLBAR = 'toolbar';

    protected const string BLOCK_PREFIX = 'spryker_rich_text_editor';

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
            $view->vars[static::OPTION_ATTR] ?? [],
            [static::ATTRIBUTE_EDITOR => $this->encodeEditorConfig($options)],
        );
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        parent::configureOptions($resolver);

        $resolver->setDefaults([
            static::OPTION_EDITOR_CONFIG => null,
            static::OPTION_TOOLBAR => static::SUPPORTED_TOOLBAR_ITEMS,
        ]);

        $resolver->setAllowedTypes(static::OPTION_EDITOR_CONFIG, ['string', 'null']);
        $resolver->setAllowedTypes(static::OPTION_TOOLBAR, 'string[]');
        $resolver->setAllowedValues(static::OPTION_TOOLBAR, function (array $toolbarItems): bool {
            return array_diff($toolbarItems, static::SUPPORTED_TOOLBAR_ITEMS) === [];
        });
    }

    public function getParent(): string
    {
        return TextareaType::class;
    }

    public function getBlockPrefix(): string
    {
        return static::BLOCK_PREFIX;
    }

    /**
     * @param array<string, mixed> $options
     */
    protected function encodeEditorConfig(array $options): ?string
    {
        return $this->getFactory()->getUtilEncodingService()->encodeJson($this->buildEditorConfig($options));
    }

    /**
     * @param array<string, mixed> $options
     *
     * @return array<string, mixed>
     */
    protected function buildEditorConfig(array $options): array
    {
        $editorConfig = [
            static::CONFIG_KEY_TOOLBAR => array_values($options[static::OPTION_TOOLBAR]),
        ];

        if ($options[static::OPTION_EDITOR_CONFIG] !== null) {
            $editorConfig[static::CONFIG_KEY_EDITOR_CONFIG] = $options[static::OPTION_EDITOR_CONFIG];
        }

        return $editorConfig;
    }
}
