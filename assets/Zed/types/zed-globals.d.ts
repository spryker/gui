// Injected by webpack's ProvidePlugin and DefinePlugin, so no module imports them.

/// <reference types="jquery" />

declare global {
    const $: JQueryStatic;
    const jQuery: JQueryStatic;

    const DEV: boolean;

    const WATCH: boolean;

    const SprykerAjax: SprykerAjaxStatic;
    const SprykerAjaxCallbacks: SprykerAjaxCallbacksStatic;
    const SprykerAlert: SprykerAlertStatic;

    interface Window {
        $: JQueryStatic;
        jQuery: JQueryStatic;
    }
}

// Deliberately opaque: for these frozen, untyped legacy constructors a wrong signature is worse than none.
interface SprykerAjaxStatic {
    new (options?: unknown): unknown;
    (options?: unknown): unknown;
}

interface SprykerAjaxCallbacksStatic {
    new (options?: unknown): unknown;
    (options?: unknown): unknown;
}

interface SprykerAlertStatic {
    new (options?: unknown): unknown;
    (options?: unknown): unknown;
}

export {};
