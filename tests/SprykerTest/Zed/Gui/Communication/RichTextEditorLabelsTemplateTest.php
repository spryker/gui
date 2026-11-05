<?php

/**
 * Copyright © 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

namespace SprykerTest\Zed\Gui\Communication;

use Codeception\Test\Unit;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Twig\TwigFilter;

/**
 * Auto-generated group annotations
 *
 * @group SprykerTest
 * @group Zed
 * @group Gui
 * @group Communication
 * @group RichTextEditorLabelsTemplateTest
 * Add your own group annotations below this line
 */
class RichTextEditorLabelsTemplateTest extends Unit
{
    protected const string LABELS_TEMPLATE = '@Gui/RichTextEditor/labels.twig';

    protected const string MODULE_ROOT = __DIR__ . '/../../../../..';

    protected const string RICH_TEXT_EDITOR_ASSETS = self::MODULE_ROOT . '/assets/Zed/js/modules/libs/rich-text-editor';

    protected const string LABELS_ELEMENT_PATTERN = '#<script type="application/json" id="%s">(.*)</script>#s';

    protected const string COLOR_LABEL_KEY_PREFIX = 'color';

    public function testLabelsHaveTheKeysAndEnglishTextsOfTheEditorDefaults(): void
    {
        // Act
        $labels = $this->decodeLabels($this->renderLabels(static fn (string $text): string => $text));

        // Assert
        $this->assertSame($this->readEditorDefaults(), $labels);
    }

    public function testLabelsAreTranslated(): void
    {
        // Act
        $labels = $this->decodeLabels($this->renderLabels(static fn (string $text): string => 'de:' . $text));

        // Assert
        $this->assertSame('de:Bold', $labels['bold']);
        $this->assertSame('de:Dove Gray', $labels['colorDoveGray']);
    }

    public function testTranslatedTextCannotCloseTheScriptElement(): void
    {
        // Act
        $renderedLabels = $this->renderLabels(static fn (string $text): string => '</script><img src=x onerror=alert(1)>');

        // Assert
        $this->assertSame(1, substr_count($renderedLabels, '</script>'));
        $this->assertStringNotContainsString('<img', $renderedLabels);
    }

    /**
     * @dataProvider provideTranslationFiles
     */
    public function testEveryLabelHasATranslationRow(string $translationFile): void
    {
        // Arrange
        $translations = $this->readTranslations(static::MODULE_ROOT . '/data/translation/Zed/' . $translationFile);

        // Act
        $missingTexts = array_values(array_diff($this->readEditorDefaults(), array_keys($translations)));

        // Assert
        $this->assertSame([], $missingTexts);
    }

    /**
     * @return array<string, array<string>>
     */
    protected function provideTranslationFiles(): array
    {
        return [
            'en_US' => ['en_US.csv'],
            'de_DE' => ['de_DE.csv'],
        ];
    }

    protected function renderLabels(callable $translate): string
    {
        $loader = new FilesystemLoader();
        $loader->addPath(static::MODULE_ROOT . '/src/Spryker/Zed/Gui/Presentation', 'Gui');

        $twig = new Environment($loader, ['strict_variables' => true, 'autoescape' => 'html']);
        $twig->addFilter(new TwigFilter('trans', $translate));

        return $twig->render(static::LABELS_TEMPLATE);
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeLabels(string $renderedLabels): array
    {
        $labelsElementPattern = sprintf(static::LABELS_ELEMENT_PATTERN, preg_quote($this->readLabelsElementId(), '#'));
        $this->assertSame(1, preg_match($labelsElementPattern, $renderedLabels, $matches));

        return json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    }

    protected function readLabelsElementId(): string
    {
        $labelsSource = (string)file_get_contents(static::RICH_TEXT_EDITOR_ASSETS . '/labels.ts');
        preg_match("/export const LABELS_ELEMENT_ID = '([\\w-]+)';/", $labelsSource, $labelsElementId);
        $this->assertArrayHasKey(1, $labelsElementId);

        return $labelsElementId[1] ?? '';
    }

    /**
     * The editor's English labels: `DEFAULT_LABELS` (labels.ts) and the colour names (toolbar/palette.ts).
     *
     * @return array<string, string>
     */
    protected function readEditorDefaults(): array
    {
        $labelsSource = (string)file_get_contents(static::RICH_TEXT_EDITOR_ASSETS . '/labels.ts');
        preg_match('/export const DEFAULT_LABELS = \{(.*?)\} as const;/s', $labelsSource, $defaultLabels);
        preg_match_all("/(\w+):\s*'((?:[^'\\\\]|\\\\.)*)'/", $defaultLabels[1] ?? '', $labelMatches, PREG_SET_ORDER);

        $paletteSource = (string)file_get_contents(static::RICH_TEXT_EDITOR_ASSETS . '/toolbar/palette.ts');
        preg_match_all("/\['#[0-9A-F]{6}', '([^']+)'\]/", $paletteSource, $colorMatches, PREG_SET_ORDER);

        $defaults = [];

        foreach ($labelMatches as [, $key, $text]) {
            $defaults[$key] = stripslashes($text);
        }

        foreach ($colorMatches as [, $colorName]) {
            $defaults[static::COLOR_LABEL_KEY_PREFIX . str_replace(' ', '', $colorName)] = $colorName;
        }

        $this->assertNotEmpty($labelMatches);
        $this->assertNotEmpty($colorMatches);

        return $defaults;
    }

    /**
     * @return array<string, string>
     */
    protected function readTranslations(string $translationFile): array
    {
        $translations = [];

        foreach ((array)file($translationFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            [$source, $translation] = str_getcsv((string)$line, ',', '"', '\\');
            $translations[(string)$source] = (string)$translation;
        }

        return $translations;
    }
}
