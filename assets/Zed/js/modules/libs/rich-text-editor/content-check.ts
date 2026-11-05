import { createDocument, elementFromString } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import type { Labels } from './labels';
import type { ContentCheckResult } from './types';

// The exact error createNodeFromContent() raises for unknown elements (@tiptap/core, errorOnInvalidContent).
const INVALID_HTML_CONTENT_MESSAGE = '[tiptap error]: Invalid HTML content';
const INVALID_ELEMENT_PREFIX = 'Invalid element found: ';
const COMMENT_START = '<!--';
const GUARD_NOTICE_ELEMENT_PLACEHOLDER = '%element%';

export const VALID_CONTENT: ContentCheckResult = { isValid: true, invalidElement: null };

const extractInvalidElement = (error: Error): string | null => {
    const causeMessage = error.cause instanceof Error ? error.cause.message : '';

    return causeMessage.startsWith(INVALID_ELEMENT_PREFIX) ? causeMessage.slice(INVALID_ELEMENT_PREFIX.length) : null;
};

const findComment = (html: string): string | null => {
    const body = elementFromString(html);
    const comment = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_COMMENT).nextNode();

    return comment === null ? null : `${COMMENT_START}${comment.nodeValue ?? ''}-->`;
};

/**
 * Reports whether the editor schema can represent every element of the HTML. Only Tiptap's
 * invalid-content error is translated into a result; any other error is a defect and propagates.
 */
export const checkContent = (html: string, schema: Schema): ContentCheckResult => {
    // The parser drops comments without a trace, so a comment would disappear on the next save.
    const comment = html.includes(COMMENT_START) ? findComment(html) : null;

    if (comment !== null) {
        return { isValid: false, invalidElement: comment };
    }

    try {
        createDocument(html, schema, {}, { errorOnInvalidContent: true });

        return VALID_CONTENT;
    } catch (error) {
        if (!(error instanceof Error) || error.message !== INVALID_HTML_CONTENT_MESSAGE) {
            throw error;
        }

        return { isValid: false, invalidElement: extractInvalidElement(error) };
    }
};

/** A short, human-readable name of the offending element, e.g. `<iframe>`, for notices. */
export const describeInvalidElement = (result: ContentCheckResult, labels: Labels): string => {
    if (result.invalidElement?.startsWith(COMMENT_START)) {
        return labels.get('guardHtmlComment');
    }

    const tagName = /^<([a-z][\w-]*)/i.exec(result.invalidElement ?? '')?.[1];

    return tagName === undefined ? labels.get('guardUnsupportedHtml') : `<${tagName.toLowerCase()}>`;
};

/** The notice of a field the content guard kept in source mode. */
export const buildGuardNotice = (result: ContentCheckResult, labels: Labels): string =>
    labels.get('guardNotice').replace(GUARD_NOTICE_ELEMENT_PLACEHOLDER, describeInvalidElement(result, labels));
