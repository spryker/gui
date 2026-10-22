/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

'use strict';

const bootstrap = require('bootstrap');

const TRIGGER_SELECTOR =
    'a[href][data-confirm], button[data-confirm]:not([type="button"]):not([type="reset"]), input[type="submit"][data-confirm]';
const LINK_SELECTOR = 'a[href]';
const TYPE_CLASSES = {
    danger: 'btn-danger',
    primary: 'btn-primary',
};
const DEFAULT_TYPE = 'danger';

/**
 * The original action is replayed only after Confirm: a submit button re-submits its own form with itself
 * as the submitter (so CSRF token, `formaction` and the button's name/value are kept).
 */
export class ActionConfirmation {
    modalElement = null;
    modal = null;
    title = null;
    message = null;
    confirmButton = null;
    cancelButton = null;
    pendingTrigger = null;

    constructor(modalSelector = '#action-confirmation-modal') {
        this.modalElement = document.querySelector(modalSelector);

        if (!this.modalElement) {
            return;
        }

        this.title = this.modalElement.querySelector('.modal-title');
        this.message = this.modalElement.querySelector('.js-action-confirmation-message');
        this.confirmButton = this.modalElement.querySelector('.js-action-confirmation-confirm-button');
        this.cancelButton = this.modalElement.querySelector('.js-action-confirmation-cancel-button');

        if (!this.title || !this.message || !this.confirmButton || !this.cancelButton) {
            return;
        }

        this.modal = bootstrap.Modal.getOrCreateInstance(this.modalElement);
        this.init();
    }

    init() {
        // Capture phase: the trigger must be intercepted before the body-delegated `.safe-submit` handler,
        // which would otherwise disable every submit button on the page even when the user cancels.
        document.addEventListener('click', (event) => this.onTriggerClick(event), true);
        this.confirmButton.addEventListener('click', () => this.onConfirm());
        // The least destructive choice gets the focus, so a stray Enter does not run the action.
        this.modalElement.addEventListener('shown.bs.modal', () => this.cancelButton.focus());
        this.modalElement.addEventListener('hidden.bs.modal', () => this.onHidden());
    }

    onTriggerClick(event) {
        const trigger = event.target instanceof Element ? event.target.closest(TRIGGER_SELECTOR) : null;

        if (!trigger) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        this.open(trigger);
    }

    open(trigger) {
        const type = TYPE_CLASSES[trigger.dataset.confirmType] ? trigger.dataset.confirmType : DEFAULT_TYPE;

        this.pendingTrigger = trigger;
        this.title.textContent = trigger.dataset.confirmTitle || this.confirmButton.dataset.defaultTitle || '';
        this.message.textContent = trigger.dataset.confirmMessage || this.message.dataset.defaultMessage || '';
        this.confirmButton.textContent =
            trigger.dataset.confirmButton || this.confirmButton.dataset.defaultButton || '';
        this.confirmButton.classList.remove(...Object.values(TYPE_CLASSES));
        this.confirmButton.classList.add(TYPE_CLASSES[type]);
        this.confirmButton.disabled = false;

        this.modal.show();
    }

    onConfirm() {
        const trigger = this.pendingTrigger;

        // The table can be redrawn while the modal is open; never act on a row that is no longer shown.
        if (!trigger || !trigger.isConnected) {
            this.modal.hide();

            return;
        }

        this.confirmButton.disabled = true;
        this.modal.hide();
        this.execute(trigger);
    }

    execute(trigger) {
        if (trigger.matches(LINK_SELECTOR)) {
            if (trigger.target && trigger.target !== '_self') {
                window.open(trigger.href, trigger.target, 'noopener');

                return;
            }

            window.location.assign(trigger.href);

            return;
        }

        const form = trigger.form;

        if (!form) {
            return;
        }

        const isSubmittable = form.noValidate || trigger.formNoValidate || form.checkValidity();

        if (form.requestSubmit) {
            form.requestSubmit(trigger);
        } else {
            form.submit();
        }

        // Keeps the `.safe-submit` contract that the capture-phase listener bypassed: no second submission.
        if (isSubmittable && trigger.classList.contains('safe-submit')) {
            trigger.disabled = true;
            trigger.classList.add('disabled');
        }
    }

    onHidden() {
        // Bootstrap restores focus only for modals opened via data-bs-toggle, not for programmatic show().
        if (this.pendingTrigger && this.pendingTrigger.isConnected && !this.pendingTrigger.disabled) {
            this.pendingTrigger.focus();
        }

        this.pendingTrigger = null;
    }
}
