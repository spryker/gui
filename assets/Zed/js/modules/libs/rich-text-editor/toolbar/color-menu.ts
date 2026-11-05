import type { ChainedCommands, Editor } from '@tiptap/core';
import type { Labels } from '../labels';
import type { ToolbarItemDefinition, ToolbarMenuItem } from '../types';
import type { IconShape } from './icons';
import { COLOR_PALETTE } from './palette';

export type TextStyleAttribute = 'color' | 'backgroundColor' | 'fontSize';

export interface ColorMenuOptions {
    readonly id: string;
    readonly label: string;
    readonly resetLabel: string;
    readonly labels: Labels;
    readonly iconShape: IconShape;
    readonly attribute: TextStyleAttribute;
    set(chain: ChainedCommands, color: string): ChainedCommands;
    unset(chain: ChainedCommands): ChainedCommands;
}

/** A TextStyle attribute of the selection (e.g. `fontSize: '18px'`), or '' when it has none. */
export const readTextStyle = (editor: Editor, attribute: TextStyleAttribute): string => {
    const value: unknown = editor.getAttributes('textStyle')[attribute];

    return typeof value === 'string' ? value : '';
};

// The browser's own form of a colour: stored colours come back as rgb(), the palette is hex.
const toCssColor = (color: string): string => {
    const probe = document.createElement('span');
    probe.style.color = color;

    return probe.style.color;
};

/** Summernote's palette with a reset entry; the colour of the selection is checked when the menu opens. */
export const createColorMenu = (options: ColorMenuOptions): ToolbarItemDefinition => {
    // No colour applies where the schema allows no text style, e.g. in a code block.
    const canSetColor = (editor: Editor): boolean => options.unset(editor.can().chain()).run();
    const menuItems: ToolbarMenuItem[] = [
        { value: '', label: options.resetLabel, isEnabled: canSetColor },
        ...COLOR_PALETTE.map(({ color, name, labelKey }) => ({
            value: color,
            label: options.labels.label(labelKey, name),
            swatch: color,
            isEnabled: canSetColor,
        })),
    ];
    const paletteByCssColor = new Map(COLOR_PALETTE.map(({ color }) => [toCssColor(color), color]));

    return {
        id: options.id,
        label: options.label,
        iconShape: options.iconShape,
        kind: 'menu',
        menuItems,
        run: (editor, value) => {
            const chain = editor.chain().focus();
            (value ? options.set(chain, value) : options.unset(chain)).run();
        },
        activeValue: (editor) => {
            const color = readTextStyle(editor, options.attribute);

            return color === '' ? '' : (paletteByCssColor.get(toCssColor(color)) ?? null);
        },
    };
};
