<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication\Form\Type;

use Codeception\Test\Unit;
use Spryker\Zed\Gui\Communication\Form\Type\RichTextEditorType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\Form\Forms;
use Symfony\Component\OptionsResolver\Exception\InvalidOptionsException;

/**
 * Auto-generated group annotations
 *
 * @group SprykerTest
 * @group Zed
 * @group Gui
 * @group Communication
 * @group Form
 * @group Type
 * @group RichTextEditorTypeTest
 * Add your own group annotations below this line
 */
class RichTextEditorTypeTest extends Unit
{
    protected const string ATTRIBUTE_EDITOR = 'data-spryker-rich-text-editor';

    protected const string EDITOR_CONFIG_CMS = 'cms';

    protected const string SUBMITTED_HTML = '<p><strong>Hello</strong></p>';

    protected FormFactoryInterface $formFactory;

    protected function _before(): void
    {
        $this->formFactory = Forms::createFormFactoryBuilder()->getFormFactory();
    }

    public function testBuildViewWritesTheFullToolbarWhenNoOptionIsGiven(): void
    {
        // Act
        $editorConfig = $this->readEditorConfig([]);

        // Assert
        $this->assertSame(['toolbar' => RichTextEditorType::SUPPORTED_TOOLBAR_ITEMS], $editorConfig);
    }

    public function testBuildViewWritesTheEditorConfigName(): void
    {
        // Act
        $editorConfig = $this->readEditorConfig(['editor_config' => static::EDITOR_CONFIG_CMS]);

        // Assert
        $this->assertSame(static::EDITOR_CONFIG_CMS, $editorConfig['editorConfig']);
    }

    public function testBuildViewWritesTheGivenToolbarItems(): void
    {
        // Arrange
        $toolbarItems = [RichTextEditorType::TOOLBAR_ITEM_BOLD, RichTextEditorType::TOOLBAR_ITEM_LINK];

        // Act
        $editorConfig = $this->readEditorConfig(['toolbar' => $toolbarItems]);

        // Assert
        $this->assertSame($toolbarItems, $editorConfig['toolbar']);
    }

    public function testDefaultToolbarStartsWithTheTextStyleItem(): void
    {
        // Act
        $editorConfig = $this->readEditorConfig([]);

        // Assert
        $this->assertSame(RichTextEditorType::TOOLBAR_ITEM_STYLE, $editorConfig['toolbar'][0]);
    }

    public function testDefaultToolbarOffersFullscreenBeforeTheHtmlSource(): void
    {
        // Act
        $editorConfig = $this->readEditorConfig([]);

        // Assert
        $this->assertSame(
            [RichTextEditorType::TOOLBAR_ITEM_FULLSCREEN, RichTextEditorType::TOOLBAR_ITEM_SOURCE],
            array_slice($editorConfig['toolbar'], -2),
        );
    }

    public function testUnknownToolbarItemIsRejected(): void
    {
        // Expect
        $this->expectException(InvalidOptionsException::class);

        // Act
        $this->formFactory->create(RichTextEditorType::class, null, ['toolbar' => ['summernote-button']]);
    }

    public function testBuildViewKeepsOtherAttributesButOwnsTheEditorAttribute(): void
    {
        // Arrange
        $form = $this->formFactory->create(RichTextEditorType::class, null, [
            'attr' => ['class' => 'custom-class', static::ATTRIBUTE_EDITOR => '{}'],
        ]);

        // Act
        $attributes = $form->createView()->vars['attr'];

        // Assert
        $this->assertSame('custom-class', $attributes['class']);
        $this->assertSame(
            ['toolbar' => RichTextEditorType::SUPPORTED_TOOLBAR_ITEMS],
            json_decode($attributes[static::ATTRIBUTE_EDITOR], true),
        );
    }

    public function testSubmittedHtmlIsKeptAsTheFieldValue(): void
    {
        // Arrange
        $form = $this->formFactory->create(RichTextEditorType::class);

        // Act
        $form->submit(static::SUBMITTED_HTML);

        // Assert
        $this->assertSame(static::SUBMITTED_HTML, $form->getData());
    }

    public function testTypeExtendsTheTextarea(): void
    {
        // Act
        $parent = (new RichTextEditorType())->getParent();

        // Assert
        $this->assertSame(TextareaType::class, $parent);
    }

    /**
     * @param array<string, mixed> $options
     *
     * @return array<string, mixed>
     */
    protected function readEditorConfig(array $options): array
    {
        $view = $this->formFactory->create(RichTextEditorType::class, null, $options)->createView();

        return json_decode($view->vars['attr'][static::ATTRIBUTE_EDITOR], true);
    }
}
