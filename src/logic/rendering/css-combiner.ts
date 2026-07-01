const STYLE_TAG = (css: string): string => `<style>${css.trim()}</style>`;

export const combineCssWithHtml = (html: string, cssSource?: string): string => {
  const css = cssSource?.trim();
  if (!css) return html;

  const style = STYLE_TAG(css);
  const headCloseIndex = html.search(/<\/head\s*>/i);
  if (headCloseIndex >= 0) {
    return `${html.slice(0, headCloseIndex)}${style}${html.slice(headCloseIndex)}`;
  }

  return `${style}${html}`;
};
