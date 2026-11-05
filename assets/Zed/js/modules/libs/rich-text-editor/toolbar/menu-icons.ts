// Icons of the link, image and table menus, drawn in the 24 × 24 grid and weight of the toolbar's stroke icons.

import type { IconShape } from './icons';

export const ICON_EDIT: IconShape = {
    stroke: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13.5 6.5l4 4'],
};

export const ICON_OPEN_EXTERNAL: IconShape = {
    stroke: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
};

export const ICON_UNLINK: IconShape = {
    stroke: [
        'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1',
        'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
        'M3 3l18 18',
    ],
};

export const ICON_TRASH: IconShape = {
    stroke: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
};

export const ICON_ROW_BEFORE: IconShape = {
    stroke: ['M4 11h16v9H4z', 'M12 11v9', 'M12 3v6', 'M9 6h6'],
};

export const ICON_ROW_AFTER: IconShape = {
    stroke: ['M4 4h16v9H4z', 'M12 4v9', 'M12 15v6', 'M9 18h6'],
};

export const ICON_COLUMN_BEFORE: IconShape = {
    stroke: ['M11 4h9v16h-9z', 'M11 12h9', 'M3 12h6', 'M6 9v6'],
};

export const ICON_COLUMN_AFTER: IconShape = {
    stroke: ['M4 4h9v16H4z', 'M4 12h9', 'M15 12h6', 'M18 9v6'],
};

export const ICON_DELETE_ROW: IconShape = {
    stroke: ['M4 4h16v9H4z', 'M12 4v9', 'M10 16l4 4', 'M14 16l-4 4'],
};

export const ICON_DELETE_COLUMN: IconShape = {
    stroke: ['M4 4h9v16H4z', 'M4 12h9', 'M16 10l4 4', 'M20 10l-4 4'],
};

export const ICON_MERGE_CELLS: IconShape = {
    stroke: ['M4 6h16v12H4z', 'M6.5 12H11', 'M9 10l2 2-2 2', 'M17.5 12H13', 'M15 10l-2 2 2 2'],
};

export const ICON_SPLIT_CELL: IconShape = {
    stroke: ['M4 6h16v12H4z', 'M12 6v12', 'M10 12H6.5', 'M8 10l-2 2 2 2', 'M14 12h3.5', 'M16 10l2 2-2 2'],
};

export const ICON_HEADER_ROW: IconShape = {
    fill: [{ d: 'M4 4h16v5H4z' }],
    stroke: ['M4 4h16v16H4z', 'M4 14.5h16', 'M12 9v11'],
};

export const ICON_FLOAT_LEFT: IconShape = {
    stroke: ['M4 5h7v7H4z', 'M15 6h5', 'M15 10h5', 'M4 16h16', 'M4 20h16'],
};

export const ICON_FLOAT_RIGHT: IconShape = {
    stroke: ['M13 5h7v7h-7z', 'M4 6h5', 'M4 10h5', 'M4 16h16', 'M4 20h16'],
};

export const ICON_FLOAT_NONE: IconShape = {
    stroke: ['M8 4h8v8H8z', 'M4 16h16', 'M4 20h16'],
};

export const ICON_ORIGINAL_SIZE: IconShape = {
    stroke: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5'],
};
