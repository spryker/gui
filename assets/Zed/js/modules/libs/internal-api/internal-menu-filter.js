'use strict';

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_DELAY = 150;

class InternalMenuFilter {
    constructor() {
        this.filterInput = document.querySelector('.js-menu-filter-input');
        this.menu = document.querySelector('.js-navigation-menu');

        if (!this.filterInput || !this.menu) {
            return;
        }

        this.debounceTimer = null;
        this.firstMatchedLink = null;
        this.init();
    }

    init() {
        this.#bindEvents();
    }

    #bindEvents() {
        this.filterInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.#handleFilterInput(e.target.value);
            }, DEBOUNCE_DELAY);
        });

        this.filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.#openFirstMatch();
            }
        });
    }

    #handleFilterInput(value) {
        const searchTerm = value.trim().toLowerCase();

        if (searchTerm.length < MIN_SEARCH_LENGTH) {
            this.#resetFilter();
            return;
        }

        this.#applyFilter(searchTerm);
    }

    #applyFilter(searchTerm) {
        this.menu.classList.add('filtered');
        this.firstMatchedLink = null;

        const items = this.menu.querySelectorAll('li');
        items.forEach((item) => item.classList.remove('matched'));

        items.forEach((item) => {
            const label = item.querySelector('.nav-label')?.textContent.trim().toLowerCase();
            if (!label?.includes(searchTerm)) return;

            item.classList.add('matched');

            if (!this.firstMatchedLink) {
                const link = item.querySelector('a');
                if (link?.getAttribute('href') !== 'javascript:void(0)') {
                    this.firstMatchedLink = link;
                }
            }

            this.#findParentItem(item)?.classList.add('matched');

            const children = item.querySelectorAll('ul.nav-second-level > li');
            if (
                children.length &&
                !Array.from(children).some((c) =>
                    c.querySelector('.nav-label')?.textContent.trim().toLowerCase().includes(searchTerm),
                )
            ) {
                children.forEach((c) => c.classList.add('matched'));
            }
        });
    }

    #findParentItem(element) {
        const parentUl = element.closest('ul.nav-second-level');
        if (!parentUl) return null;

        return parentUl.closest('li');
    }

    #resetFilter() {
        this.menu.classList.remove('filtered');
        this.firstMatchedLink = null;

        const menuItems = this.menu.querySelectorAll('li');
        menuItems.forEach((item) => {
            item.classList.remove('matched');
        });
    }

    #openFirstMatch() {
        if (this.firstMatchedLink) {
            this.firstMatchedLink.click();
        }
    }
}

module.exports = InternalMenuFilter;
