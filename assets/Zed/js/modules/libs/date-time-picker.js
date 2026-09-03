/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

import flatpickr from 'flatpickr';

export const PICKER_ATTRIBUTE = 'data-spryker-picker';

const TYPE_DATE = 'date';
const TYPE_DATETIME = 'datetime';
const TYPE_TIME = 'time';

const ROLE_START = 'start';
const ROLE_END = 'end';

const DEFAULT_FORMATS = {
    [TYPE_DATE]: 'Y-m-d',
    [TYPE_DATETIME]: 'Y-m-d H:i',
    [TYPE_TIME]: 'H:i',
};

const AUTOCOMPLETE_ATTRIBUTE = 'autocomplete';
const AUTOCOMPLETE_OFF = 'off';

/**
 * Configuration keys named after the flatpickr options they set, so they are forwarded verbatim.
 * Anything outside this list is ignored: the configuration stays a documented contract rather than
 * arbitrary access to the library's options.
 */
const FORWARDED_OPTIONS = ['dateFormat', 'altFormat', 'minDate', 'maxDate', 'minuteIncrement'];

/**
 * Standard date/time picker for the Back Office.
 *
 * Binds flatpickr to every `[data-spryker-picker]` input, reading its configuration from the JSON
 * object that `DatePickerType`/`DateTimePickerType` writes into that attribute, so modules declare
 * intent in their form types instead of shipping their own initialization JS.
 *
 * Keys that set a flatpickr option carry that option's name and are forwarded unchanged:
 *   dateFormat       format of the submitted value
 *   altFormat        human-readable format shown to the user
 *   minDate          lower bound
 *   maxDate          upper bound
 *   minuteIncrement  minute increment for date-time and time pickers
 *
 * The remaining keys are Spryker's own, because flatpickr has no equivalent:
 *   type             "date" | "datetime" | "time"
 *   rangeGroup       range group id, shared by the two inputs of a range
 *   rangeRole        "start" | "end"
 */
export class DateTimePicker {
    constructor(selector = `[${PICKER_ATTRIBUTE}]`) {
        this.selector = selector;
        this.rangeGroups = new Map();
        this.init();
    }

    init() {
        document.querySelectorAll(this.selector).forEach((input) => this.initPicker(input));
        this.rangeGroups.forEach((group) => this.linkRangeGroup(group));
    }

    initPicker(input) {
        if (input.flatpickrInstance) {
            return;
        }

        const pickerConfig = this.readConfig(input);
        const instance = flatpickr(input, this.buildConfig(pickerConfig));

        if (!instance) {
            return;
        }

        input.flatpickrInstance = instance;
        this.collectRangeMember(instance, pickerConfig);
    }

    readConfig(input) {
        const value = input.getAttribute(PICKER_ATTRIBUTE);

        if (!value) {
            return {};
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(`Malformed ${PICKER_ATTRIBUTE} configuration: ${value}`, error);

            return {};
        }
    }

    buildConfig(pickerConfig) {
        const type = pickerConfig.type || TYPE_DATE;

        const config = {
            dateFormat: DEFAULT_FORMATS[type] || DEFAULT_FORMATS[TYPE_DATE],
            enableTime: type === TYPE_DATETIME || type === TYPE_TIME,
            noCalendar: type === TYPE_TIME,
            time_24hr: true,
            // The native picker is suppressed by rendering a text input, so mobile can use flatpickr too.
            disableMobile: true,
            allowInput: true,
            onReady: (selectedDates, dateStr, instance) => this.disableAutocomplete(instance),
        };

        FORWARDED_OPTIONS.forEach((name) => {
            if (pickerConfig[name] === undefined) {
                return;
            }

            config[name] = pickerConfig[name];
        });

        if (pickerConfig.altFormat) {
            config.altInput = true;
        }

        return config;
    }

    disableAutocomplete(instance) {
        [instance.input, instance.altInput].filter(Boolean).forEach((input) => {
            input.setAttribute(AUTOCOMPLETE_ATTRIBUTE, AUTOCOMPLETE_OFF);
        });
    }

    collectRangeMember(instance, pickerConfig) {
        const groupName = pickerConfig.rangeGroup;
        const role = pickerConfig.rangeRole;

        if (!groupName || (role !== ROLE_START && role !== ROLE_END)) {
            return;
        }

        if (!this.rangeGroups.has(groupName)) {
            this.rangeGroups.set(groupName, {});
        }

        this.rangeGroups.get(groupName)[role] = instance;
    }

    linkRangeGroup(group) {
        const start = group[ROLE_START];
        const end = group[ROLE_END];

        if (!start || !end) {
            return;
        }

        start.config.onChange.push((selectedDates) => {
            end.set('minDate', selectedDates[0] || null);
        });

        end.config.onChange.push((selectedDates) => {
            start.set('maxDate', selectedDates[0] || null);
        });

        if (start.selectedDates.length) {
            end.set('minDate', start.selectedDates[0]);
        }

        if (end.selectedDates.length) {
            start.set('maxDate', end.selectedDates[0]);
        }
    }
}

const initDateTimePicker = () => new DateTimePicker();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDateTimePicker, { once: true });
} else {
    initDateTimePicker();
}
