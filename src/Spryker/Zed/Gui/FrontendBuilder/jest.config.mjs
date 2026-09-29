// Jest cannot strip types, so ts-jest transforms the ESM tree; that needs --experimental-vm-modules,
// which `npm run zed:builder:test` sets. ts-jest rather than @swc/jest avoids native binaries.
export default {
    displayName: 'backoffice-builder',
    rootDir: '.',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__tests__/**/*.test.mts'],
    // `ts` covers the Back Office runtime under test; `mjs`/`js`/`json` only resolve imported dependencies.
    moduleFileExtensions: ['mts', 'ts', 'mjs', 'js', 'json'],
    extensionsToTreatAsEsm: ['.mts'],
    transform: {
        '^.+\\.(mts|ts)$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: '<rootDir>/tsconfig.tests.json',
            },
        ],
    },
    // Node needs the literal `.mts` on relative specifiers; Jest resolves extensionless module ids.
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.mts$': '$1',
    },
};
