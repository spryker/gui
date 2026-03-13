import Swal from 'sweetalert2';

export default function () {
    window.sweetAlert = function (options) {
        // Map SweetAlert v1 options to SweetAlert2
        const mapped = {
            title: options.title,
            text: options.text,
            icon: options.type, // v1 uses "type", v2 uses "icon"
            // You can map more options here if needed
        };

        return Swal.fire(mapped);
    };

    // Some projects also use swal(), so mirror it:
    window.swal = window.sweetAlert;
}
