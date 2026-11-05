// Bootstrap 5 ships no type definitions; only the API the Back Office TypeScript uses is declared.
declare module 'bootstrap' {
    export class Modal {
        static getOrCreateInstance(element: Element, options?: Record<string, unknown>): Modal;
        show(): void;
        hide(): void;
        dispose(): void;
    }
}
