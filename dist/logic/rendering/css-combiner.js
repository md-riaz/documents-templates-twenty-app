"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineCssWithHtml = void 0;
const STYLE_TAG = (css) => `<style>${css.trim()}</style>`;
const combineCssWithHtml = (html, cssSource) => {
    const css = cssSource?.trim();
    if (!css)
        return html;
    const style = STYLE_TAG(css);
    const headCloseIndex = html.search(/<\/head\s*>/i);
    if (headCloseIndex >= 0) {
        return `${html.slice(0, headCloseIndex)}${style}${html.slice(headCloseIndex)}`;
    }
    return `${style}${html}`;
};
exports.combineCssWithHtml = combineCssWithHtml;
