export const toConfigurationPathSegments = (configurationPath: string): string[] =>
    configurationPath
        .replace(/^\.\//, '')
        .split('/')
        .filter((segment) => segment.length > 0);

export const joinConfigurationPath = (...configurationPaths: string[]): string =>
    configurationPaths.flatMap(toConfigurationPathSegments).join('/');

// TypeScript resolves a path relative to the file holding it, so a nested file needs a ladder.
export const buildParentDirectoryLadder = (contextRelativeDirectory: string): string =>
    toConfigurationPathSegments(contextRelativeDirectory)
        .map(() => '..')
        .join('/');

// `extends` treats a value without a `./` or `../` prefix as a package name.
export const buildRelativeReference = (parentDirectoryLadder: string, contextRelativePath: string): string =>
    parentDirectoryLadder === ''
        ? `./${joinConfigurationPath(contextRelativePath)}`
        : joinConfigurationPath(parentDirectoryLadder, contextRelativePath);

/** `*` in the template matches exactly one path segment. */
export const matchesConfigurationPathTemplate = (configurationPath: string, pathTemplate: string): boolean => {
    const pathSegments = toConfigurationPathSegments(configurationPath);
    const templateSegments = toConfigurationPathSegments(pathTemplate);

    return (
        pathSegments.length === templateSegments.length &&
        templateSegments.every(
            (templateSegment, index) => templateSegment === '*' || templateSegment === pathSegments[index],
        )
    );
};

export const matchesAnyPathTemplate = (configurationPath: string, pathTemplates: string[]): boolean =>
    pathTemplates.some((pathTemplate) => matchesConfigurationPathTemplate(configurationPath, pathTemplate));

export const dasherize = (value: string): string =>
    value
        .replace(/[\s_]/g, '-')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
