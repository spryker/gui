import type { VideoProvider } from '../types';
import { defineVideoProvider } from './define-provider';

// Page-URL rules, embed addresses and sizes are Summernote 0.9.1's createVideoNode() (summernote-bs5.js), so a
// video inserted with either editor comes out the same. Differences: new embeds use https:// instead of
// protocol-relative URLs, obsolete attributes (allowtransparency, webkit/mozallowfullscreen) are not written,
// Vine (shut down) and direct video files (removed by the server's XSS sanitizer) are not offered.

const YOUTUBE_ID_LENGTH = 11;
const YOUTUBE_TIME = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

const parseYouTubeStart = (time: string | undefined): number => {
    if (time === undefined) {
        return 0;
    }

    const parts = time.match(YOUTUBE_TIME);

    if (parts === null) {
        return Number.parseInt(time, 10) || 0;
    }

    const [, hours, minutes, seconds] = parts.map((part) => Number.parseInt(part ?? '0', 10) || 0);

    return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
};

const youtube = defineVideoProvider({
    name: 'youtube',
    width: 640,
    height: 360,
    pageUrlPatterns: [
        /(?:youtu\.be\/|youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/))([^&\n?]+)(?:.*[?&]t=([^&\n]+))?.*/,
    ],
    toSrc: ([, id, time]) => {
        if (id?.length !== YOUTUBE_ID_LENGTH) {
            return null;
        }

        const start = parseYouTubeStart(time);

        return `https://www.youtube.com/embed/${id}${start > 0 ? `?start=${start}` : ''}`;
    },
    embedSrcPattern: /^(?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i,
});

const googleDrive = defineVideoProvider({
    name: 'google-drive',
    width: 640,
    height: 480,
    pageUrlPatterns: [/(?:\.|\/\/)drive\.google\.com\/file\/d\/(.[a-zA-Z0-9_-]*)\/view/],
    toSrc: ([, id]) => `https://drive.google.com/file/d/${id}/preview`,
    embedSrcPattern: /^(?:https?:)?\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview/i,
});

const instagram = defineVideoProvider({
    name: 'instagram',
    width: 612,
    height: 710,
    attributes: { scrolling: 'no' },
    pageUrlPatterns: [/(?:www\.|\/\/)instagram\.com\/(reel|p)\/(.[a-zA-Z0-9_-]*)/],
    toSrc: ([, , id]) => `https://instagram.com/p/${id}/embed/`,
    embedSrcPattern: /^(?:https?:)?\/\/(?:www\.)?instagram\.com\/p\/[\w-]+\/embed/i,
});

const vimeo = defineVideoProvider({
    name: 'vimeo',
    width: 640,
    height: 360,
    attributes: { allowfullscreen: '' },
    pageUrlPatterns: [/\/\/(player\.)?vimeo\.com\/([a-z]*\/)*(\d+)[?]?.*/],
    toSrc: ([, , , id]) => `https://player.vimeo.com/video/${id}`,
    embedSrcPattern: /^(?:https?:)?\/\/player\.vimeo\.com\/video\/\d+/i,
});

const dailymotion = defineVideoProvider({
    name: 'dailymotion',
    width: 640,
    height: 360,
    pageUrlPatterns: [/.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/],
    toSrc: ([, , id]) => `https://www.dailymotion.com/embed/video/${id}`,
    embedSrcPattern: /^(?:https?:)?\/\/(?:www\.)?dailymotion\.com\/embed\/video\//i,
});

const youku = defineVideoProvider({
    name: 'youku',
    width: 510,
    height: 498,
    attributes: { allowfullscreen: '' },
    pageUrlPatterns: [/\/\/v\.youku\.com\/v_show\/id_(\w+)=*\.html/],
    toSrc: ([, id]) => `https://player.youku.com/embed/${id}`,
    embedSrcPattern: /^(?:https?:)?\/\/player\.youku\.com\/embed\//i,
});

// PeerTube is federated, so any host is accepted, as in Summernote. Summernote read the query parameters from
// shifted capture groups (the video id became the start time); they are mapped to their own groups here, and
// the stop time is passed as PeerTube's `stop` parameter.
const peertube = defineVideoProvider({
    name: 'peertube',
    width: 560,
    height: 315,
    attributes: { allowfullscreen: '', sandbox: 'allow-same-origin allow-scripts allow-popups' },
    pageUrlPatterns: [
        /\/\/([^/?#]+)\/videos\/watch\/([^?#]*)(?:\?(?:start=(\w*))?(?:&stop=(\w*))?(?:&loop=([10]))?(?:&autoplay=([10]))?(?:&muted=([10]))?)?/,
    ],
    toSrc: ([, host, id, start, stop, loop, autoplay, muted]) => {
        if (!id) {
            return null;
        }

        const timing = `${start ? `&start=${start}` : ''}${stop ? `&stop=${stop}` : ''}`;

        return `https://${host}/videos/embed/${id}?loop=${loop ?? 0}&autoplay=${autoplay ?? 0}&muted=${muted ?? 0}${timing}`;
    },
    embedSrcPattern: /^(?:https?:)?\/\/[^/?#]+\/videos\/embed\//i,
});

// Summernote wrote `&amp;auto=0` through jQuery.attr(), which stored the entity itself in the address.
const qq = defineVideoProvider({
    name: 'qq',
    width: 500,
    height: 310,
    attributes: { allowfullscreen: '' },
    pageUrlPatterns: [/\/\/v\.qq\.com.*?vid=(.+)/, /\/\/v\.qq\.com\/x?\/?(?:page|cover).*?\/([^/]+)\.html\??.*/],
    toSrc: ([, id]) => `https://v.qq.com/txp/iframe/player.html?vid=${id}&auto=0`,
    embedSrcPattern: /^(?:https?:)?\/\/v\.qq\.com\/txp\/iframe\/player\.html/i,
});

const facebook = defineVideoProvider({
    name: 'facebook',
    width: 560,
    height: 301,
    attributes: { scrolling: 'no' },
    pageUrlPatterns: [/(?:www\.|\/\/)facebook\.com\/([^/]+)\/videos\/([0-9]+)/],
    toSrc: ([pageUrl]) =>
        `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(pageUrl)}&show_text=0&width=560`,
    embedSrcPattern: /^(?:https?:)?\/\/(?:www\.)?facebook\.com\/plugins\/video\.php/i,
});

/** In Summernote's order, which decides which provider claims an address first. */
export const BUILT_IN_VIDEO_PROVIDERS: readonly VideoProvider[] = [
    youtube,
    googleDrive,
    instagram,
    vimeo,
    dailymotion,
    youku,
    peertube,
    qq,
    facebook,
];

/** Built-in providers, with registered ones replacing a same-named built-in in place and new ones appended. */
export const resolveVideoProviders = (registered: readonly VideoProvider[]): VideoProvider[] => {
    const providers = [...BUILT_IN_VIDEO_PROVIDERS];

    for (const provider of registered) {
        const index = providers.findIndex(({ name }) => name === provider.name);
        providers.splice(index === -1 ? providers.length : index, index === -1 ? 0 : 1, provider);
    }

    return providers;
};
