/**
 * Copyright (c) 2016-present Spryker Systems GmbH. All rights reserved.
 * Use of this software requires acceptance of the Evaluation License Agreement. See LICENSE file.
 *
 * INSPINIA - Responsive Admin Theme
 * version 2.7.1
 */

$(document).ready(function () {
    // Add body-small class if window less than 768px
    if ($(this).width() < 769) {
        $('body').addClass('body-small');
    } else {
        $('body').removeClass('body-small');
    }

    // MetisMenu
    $('#side-menu').metisMenu();

    // Collapse ibox function
    $('.collapse-link').on('click', function () {
        var ibox = $(this).closest('div.ibox');
        var button = $(this).find('i');
        var content = ibox.children('.ibox-content');
        content.slideToggle(200);
        button.toggleClass('fa-minus').toggleClass('fa-plus');
        ibox.toggleClass('border-bottom');
        setTimeout(function () {
            ibox.resize();
            ibox.find('[id^=map-]').resize();
        }, 50);
    });

    // Close ibox function
    $('.close-link').on('click', function () {
        var content = $(this).closest('div.ibox');
        content.remove();
    });

    // Fullscreen ibox function
    $('.fullscreen-link').on('click', function () {
        var ibox = $(this).closest('div.ibox');
        var button = $(this).find('i');
        $('body').toggleClass('fullscreen-ibox-mode');
        button.toggleClass('fa-expand').toggleClass('fa-compress');
        ibox.toggleClass('fullscreen');
        setTimeout(function () {
            $(window).trigger('resize');
        }, 100);
    });

    // Close menu in canvas mode
    $('.close-canvas-menu').on('click', function () {
        $('body').toggleClass('mini-navbar');
        SmoothlyMenu();
    });

    // Open close right sidebar
    $('.right-sidebar-toggle').on('click', function () {
        $('#right-sidebar').toggleClass('sidebar-open');
    });

    // Open close small chat
    $('.open-small-chat').on('click', function () {
        $(this).children().toggleClass('fa-comments').toggleClass('fa-remove');
        $('.small-chat-box').toggleClass('active');
    });

    // Small todo handler
    $('.check-link').on('click', function () {
        var button = $(this).find('i');
        var label = $(this).next('span');
        button.toggleClass('fa-check-square').toggleClass('fa-square-o');
        label.toggleClass('todo-completed');
        return false;
    });

    // Append config box / Only for demo purpose
    // Uncomment on server mode to enable XHR calls
    //$.get("skin-config.html", function (data) {
    //    if (!$('body').hasClass('no-skin-config'))
    //        $('body').append(data);
    //});

    // Minimalize menu
    $('.navbar-minimalize').on('click', function (event) {
        event.preventDefault();
        $('body').toggleClass('mini-navbar');
        SmoothlyMenu();
    });

    // Tooltips demo
    $('.tooltip-demo').tooltip({
        selector: '[data-toggle=tooltip]',
        container: 'body',
    });

    // Full height of sidebar
    function fix_height() {
        var heightWithoutNavbar = $('body > #wrapper').height() - 61;
        $('.sidebar-panel').css('min-height', heightWithoutNavbar + 'px');

        var navbarheight = $('nav.navbar-default').height();
        var wrapperHeight = $('#page-wrapper').height();

        if (navbarheight > wrapperHeight) {
            $('#page-wrapper').css('min-height', navbarheight + 'px');
        }

        if (navbarheight < wrapperHeight) {
            $('#page-wrapper').css('min-height', $(window).height() + 'px');
        }

        if ($('body').hasClass('fixed-nav')) {
            if (navbarheight > wrapperHeight) {
                $('#page-wrapper').css('min-height', navbarheight + 'px');
            } else {
                $('#page-wrapper').css('min-height', $(window).height() - 60 + 'px');
            }
        }
    }

    fix_height();

    // Move right sidebar top after scroll
    $(window).scroll(function () {
        if ($(window).scrollTop() > 0 && !$('body').hasClass('fixed-nav')) {
            $('#right-sidebar').addClass('sidebar-top');
        } else {
            $('#right-sidebar').removeClass('sidebar-top');
        }
    });

    $(window).bind('load resize scroll', function () {
        if (!$('body').hasClass('body-small')) {
            fix_height();
        }
    });

    if (window.spryker?.isBootstrapVersionLatest) {
        const bootstrap = window.spryker.bootstrap;
        const dropdowns = document.querySelectorAll('[data-toggle=popover]');
        const dropdown = [...dropdowns].map((dropdownToggleEl) => new bootstrap.Dropdown(dropdownToggleEl));
    } else {
        $('[data-toggle=popover]').popover();
    }
});

// Minimalize menu when screen is less than 768px
$(window).bind('resize', function () {
    if ($(this).width() < 769) {
        $('body').addClass('body-small');
    } else {
        $('body').removeClass('body-small');
    }
});

// Local Storage functions
// Set proper body class and plugins based on user configuration
$(document).ready(function () {
    if (localStorageSupport()) {
        var collapse = localStorage.getItem('collapse_menu');
        var fixedsidebar = localStorage.getItem('fixedsidebar');
        var fixednavbar = localStorage.getItem('fixednavbar');
        var boxedlayout = localStorage.getItem('boxedlayout');
        var fixedfooter = localStorage.getItem('fixedfooter');

        var body = $('body');

        if (collapse == 'on') {
            if (body.hasClass('fixed-sidebar')) {
                if (!body.hasClass('body-small')) {
                    body.addClass('mini-navbar');
                }
            } else {
                if (!body.hasClass('body-small')) {
                    body.addClass('mini-navbar');
                }
            }
        }

        if (fixednavbar == 'on') {
            $('.navbar-static-top').removeClass('navbar-static-top').addClass('navbar-fixed-top');
            body.addClass('fixed-nav');
        }

        if (boxedlayout == 'on') {
            body.addClass('boxed-layout');
        }

        if (fixedfooter == 'on') {
            $('.footer').addClass('fixed');
        }
    }
});

// check if browser support HTML5 local storage
function localStorageSupport() {
    return 'localStorage' in window && window['localStorage'] !== null;
}

// For demo purpose - animation css script
function animationHover(element, animation) {
    element = $(element);
    element.hover(
        function () {
            element.addClass('animated ' + animation);
        },
        function () {
            //wait for animation to finish before removing classes
            window.setTimeout(function () {
                element.removeClass('animated ' + animation);
            }, 2000);
        },
    );
}

function SmoothlyMenu() {
    if (!$('body').hasClass('mini-navbar') || $('body').hasClass('body-small')) {
        // Hide menu in order to smoothly turn on when maximize menu
        $('#side-menu').hide();
        // For smoothly turn on menu
        setTimeout(function () {
            $('#side-menu').fadeIn(400);
        }, 200);
    } else if ($('body').hasClass('fixed-sidebar')) {
        $('#side-menu').hide();
        setTimeout(function () {
            $('#side-menu').fadeIn(400);
        }, 100);
    } else {
        // Remove all inline style from jquery fadeIn function to reset menu state
        $('#side-menu').removeAttr('style');
    }
}

// Dragable panels
function WinMove() {
    var element = '[class*=col]';
    var handle = '.ibox-title';
    var connect = '[class*=col]';
    $(element)
        .sortable({
            handle: handle,
            connectWith: connect,
            tolerance: 'pointer',
            forcePlaceholderSize: true,
            opacity: 0.8,
        })
        .disableSelection();
}
