// Loaded lazily: highlight.js ships every language and only code-block pages need it.
// `pre code` is what `hljs.highlightAll()` always matched; `pre, code` would highlight every inline `<code>`.
export class Highlight {
    constructor(selector = 'pre code') {
        this.selector = selector;
        this.init();
    }

    init() {
        const elements = document.querySelectorAll(this.selector);

        if (elements.length === 0) {
            return;
        }

        import('highlight.js')
            .then(({ default: hljs }) => {
                elements.forEach((element) => hljs.highlightElement(element));
            })
            .catch((error) => {
                console.error(
                    'Failed to load highlight.js; code blocks stay unhighlighted. This is usually a stale ' +
                        'or missing file under public/Backoffice/assets/js/chunks — rebuild the Back Office ' +
                        'assets with "npm run zed" and reload.',
                    error,
                );
            });
    }
}
