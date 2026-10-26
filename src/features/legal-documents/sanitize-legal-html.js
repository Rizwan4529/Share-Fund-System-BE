import sanitizeHtml from "sanitize-html";

/*
 * Server-side copy of the frontend's legal HTML allowlist
 * (Share-Fund-System-FE src/lib/legal/html.ts). The admin editor already
 * sanitizes before saving; this keeps stored content safe for any other
 * consumer (emails, PDFs, direct API writes).
 */
const OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  disallowedTagsMode: "discard",
};

export const sanitizeLegalHtml = (html) => sanitizeHtml(html ?? "", OPTIONS).trim();

/** True when the HTML has visible text once tags are stripped. */
export const legalHtmlHasText = (html) =>
  sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
