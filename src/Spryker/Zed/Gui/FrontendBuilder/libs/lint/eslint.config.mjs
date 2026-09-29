import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import { VENDOR_SOURCE_PREFIX, loadProjectGlobalSettings, resolveProjectRoot } from '../../settings.mts';
import { resolveLintConfigurationPath } from '../typescript/typescript-configuration.mts';

// The same roots the lint runner passes, so a project namespace registered in the settings is
// linted instead of being reported as a file no configuration matches.
const { paths } = await loadProjectGlobalSettings();
const buildOwnedSourcePatterns = (extension) =>
    Object.values(paths.sources)
        .filter((sourceRoot) => !sourceRoot.startsWith(VENDOR_SOURCE_PREFIX))
        .map((sourceRoot) => `${sourceRoot.replace(/^\.\//, '')}/**/assets/Zed/**/*.${extension}`);

const backOfficeGlobals = {
    document: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    window: 'readonly',
    $: 'readonly',
    jQuery: 'readonly',
    SprykerAjax: 'readonly',
    SprykerAlert: 'readonly',
    SprykerAjaxCallbacks: 'readonly',
    confirm: 'readonly',
    alert: 'readonly',
    localStorage: 'readonly',
    antelope: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    swal: 'readonly',
    DEV: 'readonly',
    WATCH: 'readonly',
    console: 'readonly',
    fetch: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    requestAnimationFrame: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    FormData: 'readonly',
    FileReader: 'readonly',
    Blob: 'readonly',
    File: 'readonly',
    Image: 'readonly',
    Option: 'readonly',
    NodeFilter: 'readonly',
    MutationObserver: 'readonly',
    IntersectionObserver: 'readonly',
    ResizeObserver: 'readonly',
    WeakSet: 'readonly',
    WeakMap: 'readonly',
    Promise: 'readonly',
    Map: 'readonly',
    Set: 'readonly',
    Symbol: 'readonly',
    Proxy: 'readonly',
    Reflect: 'readonly',
    AbortController: 'readonly',
    DOMParser: 'readonly',
    XMLHttpRequest: 'readonly',
    HTMLElement: 'readonly',
    Element: 'readonly',
    Node: 'readonly',
    Text: 'readonly',
    getComputedStyle: 'readonly',
    history: 'readonly',
    screen: 'readonly',
    sessionStorage: 'readonly',
    performance: 'readonly',
    self: 'readonly',
    btoa: 'readonly',
    atob: 'readonly',
    CSS: 'readonly',
    CSSStyleRule: 'readonly',
    DataTransfer: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
};

// Shared by the JavaScript and TypeScript blocks; each adds its own undefined/unused checks.
const backOfficeRules = {
    'accessor-pairs': 'error',
    // Back Office payloads come from PHP and carry snake_case keys, which the server parses.
    camelcase: ['error', { properties: 'never' }],
    eqeqeq: [
        'error',
        'always',
        {
            null: 'ignore',
        },
    ],
    'handle-callback-err': ['error', '^(err|error)$'],
    'new-cap': [
        'error',
        {
            newIsCap: true,
            capIsNew: false,
        },
    ],
    'no-array-constructor': 'error',
    'no-caller': 'error',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': ['error', 'always'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-constant-condition': [
        'error',
        {
            checkLoops: false,
        },
    ],
    'no-control-regex': 'error',
    'no-debugger': 'error',
    'no-delete-var': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty-character-class': 'error',
    'no-empty-pattern': 'error',
    'no-eval': 'error',
    'no-ex-assign': 'error',
    'no-extra-bind': 'error',
    'no-extra-boolean-cast': 'off',
    'no-fallthrough': 'error',
    'no-func-assign': 'error',
    'no-global-assign': 'error',
    'no-implied-eval': 'error',
    'no-inner-declarations': ['error', 'functions'],
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': [
        'error',
        {
            skipStrings: true,
            skipTemplates: true,
        },
    ],
    'no-iterator': 'error',
    'no-label-var': 'error',
    'no-labels': [
        'error',
        {
            allowLoop: false,
            allowSwitch: false,
        },
    ],
    'no-lone-blocks': 'error',
    'no-multi-str': 'error',
    'no-negated-in-lhs': 'error',
    'no-new-func': 'error',
    'no-new-object': 'error',
    'no-new-require': 'error',
    'no-new-wrappers': 'error',
    'no-obj-calls': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-path-concat': 'error',
    'no-proto': 'error',
    'no-prototype-builtins': 'off',
    'no-redeclare': 'error',
    'no-regex-spaces': 'error',
    'no-return-assign': ['error', 'except-parens'],
    'no-return-await': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-shadow-restricted-names': 'error',
    'no-sparse-arrays': 'error',
    'no-template-curly-in-string': 'error',
    'no-throw-literal': 'error',
    'no-undef-init': 'error',
    'no-unexpected-multiline': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unneeded-ternary': ['error'],
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'no-unused-expressions': [
        'error',
        {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
        },
    ],
    'no-use-before-define': [
        'error',
        {
            functions: false,
            classes: false,
            variables: false,
        },
    ],
    'no-useless-call': 'error',
    'no-useless-escape': 'error',
    'no-useless-return': 'error',
    'no-with': 'error',
    'one-var': [
        'error',
        {
            initialized: 'never',
        },
    ],
    'prefer-promise-reject-errors': 'error',
    'spaced-comment': [
        'error',
        'always',
        {
            line: {
                markers: ['*package', '!', '/', ',', '='],
            },
            block: {
                balanced: true,
                markers: ['*package', '!', ',', ':', '::', 'flow-include'],
                exceptions: ['*'],
            },
        },
    ],
    'unicode-bom': ['error', 'never'],
    'use-isnan': 'error',
    'valid-typeof': [
        'error',
        {
            requireStringLiterals: true,
        },
    ],
    'wrap-iife': [
        'error',
        'any',
        {
            functionPrototypeMethods: true,
        },
    ],
    yoda: ['error', 'never'],
};

export default [
    {
        ignores: [
            'docker/',
            'public/',
            '**/dist/',
            '**/node_modules/',
            'vendor/',
            // A purchased theme, re-vendored wholesale: fixes would be lost at the next update.
            '**/assets/Inspinia/**',
            '**/assets/Inspinia2/**',
            '**/*.min.js',
            // The Merchant Portal is a separate Angular application with its own lint setup.
            '**/Presentation/Components/**',
            '**/Presentation/Application/**',
        ],
    },
    {
        // Legacy modules stay CommonJS for the oryx build; `module` parses both, while `commonjs`
        // rejects `import` as a syntax error and hides the real findings.
        files: buildOwnedSourcePatterns('js'),
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...backOfficeGlobals,
                require: 'readonly',
                module: 'writable',
                exports: 'writable',
                process: 'readonly',
                __dirname: 'readonly',
            },
        },
        rules: {
            ...backOfficeRules,
            'no-undef': 'error',
            'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
        },
    },
    {
        files: buildOwnedSourcePatterns('ts'),
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: [`./${resolveLintConfigurationPath(resolveProjectRoot())}`],
            },
            globals: backOfficeGlobals,
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            ...backOfficeRules,
            // Legacy JavaScript modules are monolithic by construction; the limit applies to new TypeScript.
            'max-lines': [
                'error',
                {
                    max: 200,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            '@typescript-eslint/no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
        },
    },
];
