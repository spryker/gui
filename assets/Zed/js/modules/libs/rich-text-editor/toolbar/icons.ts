export interface IconPath {
    readonly d: string;
    /** Filled with the even-odd rule (outline icons with holes); otherwise filled with the non-zero rule. */
    readonly isEvenOdd?: boolean;
}

export interface IconShape {
    /** Paths filled with `currentColor`. */
    readonly fill?: readonly IconPath[];
    /** Paths stroked with `currentColor`, 2 units wide with round caps, matching the filled icons' weight. */
    readonly stroke?: readonly string[];
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const STROKE_WIDTH = '2';

const createPath = (d: string): SVGPathElement => {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', d);

    return path;
};

/** A decorative `<svg>`; the button carrying it has the accessible name. */
export const createIconElement = (shape: IconShape, className = 'rich-text-editor__icon'): SVGSVGElement => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    for (const { d, isEvenOdd } of shape.fill ?? []) {
        const path = createPath(d);
        path.setAttribute('fill', 'currentColor');

        if (isEvenOdd) {
            path.setAttribute('fill-rule', 'evenodd');
            path.setAttribute('clip-rule', 'evenodd');
        }

        svg.append(path);
    }

    for (const d of shape.stroke ?? []) {
        const path = createPath(d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', STROKE_WIDTH);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.append(path);
    }

    return svg;
};
