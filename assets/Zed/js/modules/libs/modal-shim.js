/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

'use strict';

import { Modal } from 'bootstrap';

/**
 * Keeps the Bootstrap 3 style `$(el).modal('show' | 'hide')` API working on top of Bootstrap 5.
 * Installed on every page, independent of which rich-text editor runs: SprykerAlert and several
 * modules (e.g. ConfigurableBundleGui, FileManagerGui) open their modals through it.
 *
 * @param {JQueryStatic} jQuery
 *
 * @returns {void}
 */
export function installModalShim(jQuery) {
    jQuery.fn.modal = function (config) {
        return this.each(() => {
            const modal = Modal.getOrCreateInstance(this[0]);
            if (config === 'show') modal.show();
            else if (config === 'hide') modal.hide();
        });
    };
}
