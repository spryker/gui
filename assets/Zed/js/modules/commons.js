/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 */

'use strict';

// external dependencies
const $ = require('jquery');
window.$ = $;
window.jQuery = $;
require('@popperjs/core');
window.bootstrap = require('bootstrap');
require('datatables.net-bs5');
require('datatables.net-buttons-bs5');
require('datatables.net-responsive-bs5');
require('datatables.net-select-bs5');
require('jquery-migrate/dist/jquery-migrate.min');
require('jquery-ui/ui/core');
require('jquery-ui/ui/effect');
require('jquery-ui/ui/effects/effect-highlight');
require('jquery-ui/ui/widget');
require('jquery-ui/ui/widgets/datepicker');
require('jquery-ui/ui/widgets/autocomplete');
require('jquery-ui/ui/widgets/button');
require('jquery-ui/ui/widgets/sortable');
require('jquery-ui/ui/widgets/tooltip');
require('pace');
require('@spryker/nestable');
require('select2');
window.CodeMirror = require('codemirror');
require('codemirror/mode/htmlmixed/htmlmixed.js');
require('summernote/dist/summernote-bs5.min');

XMLHttpRequest.prototype = Object.getPrototypeOf(new XMLHttpRequest());

// inspinia
require('../../../Inspinia/inspinia');
require('../../../Inspinia2/js/config');
require('../../../Inspinia2/js/app');

// spryker customization
require('../../sass/main.scss');
