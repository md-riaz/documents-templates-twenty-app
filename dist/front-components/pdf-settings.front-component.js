"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfSettingsFrontComponent = exports.renderPdfSettingsMarkup = exports.validatePdfSettingsState = exports.createPdfSettingsState = void 0;
const pdf_settings_1 = require("../logic/settings/pdf-settings");
const escapeAttribute = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const createPdfSettingsState = (input = {}) => ({
    ...(0, pdf_settings_1.normalizePdfSettings)({ defaults: pdf_settings_1.DEFAULT_PDF_SETTINGS, override: input.settings }),
    ...(input.settings ?? {}),
    statusMessage: input.statusMessage ?? '',
});
exports.createPdfSettingsState = createPdfSettingsState;
const validatePdfSettingsState = (state) => (0, pdf_settings_1.validatePdfSettings)(state);
exports.validatePdfSettingsState = validatePdfSettingsState;
const selected = (actual, expected) => (actual === expected ? ' selected' : '');
const renderPdfSettingsMarkup = (state) => {
    const errors = (0, exports.validatePdfSettingsState)(state);
    const liveMessage = state.statusMessage || errors.join(' ');
    return `
<section class="pdf-settings" aria-label="PDF settings">
  <h2>PDF defaults</h2>
  <label>Format
    <select name="pdf-format" aria-label="PDF page format" value="${escapeAttribute(state.format)}">
      ${['A4', 'Letter', 'Legal', 'A3', 'A5'].map((format) => `<option value="${format}"${selected(state.format, format)}>${format}</option>`).join('')}
    </select>
  </label>
  <input type="hidden" name="pdf-format" value="${escapeAttribute(state.format)}" />
  <label>Orientation
    <select name="pdf-orientation" aria-label="PDF orientation" value="${escapeAttribute(state.orientation)}">
      <option value="portrait"${selected(state.orientation, 'portrait')}>Portrait</option>
      <option value="landscape"${selected(state.orientation, 'landscape')}>Landscape</option>
    </select>
  </label>
  <input type="hidden" name="pdf-orientation" value="${escapeAttribute(state.orientation)}" />
  <fieldset>
    <legend>Margins</legend>
    <label>Top <input name="pdf-margin-top" aria-label="PDF margin top" value="${escapeAttribute(state.marginTop)}" /></label>
    <label>Right <input name="pdf-margin-right" aria-label="PDF margin right" value="${escapeAttribute(state.marginRight)}" /></label>
    <label>Bottom <input name="pdf-margin-bottom" aria-label="PDF margin bottom" value="${escapeAttribute(state.marginBottom)}" /></label>
    <label>Left <input name="pdf-margin-left" aria-label="PDF margin left" value="${escapeAttribute(state.marginLeft)}" /></label>
  </fieldset>
  <label><input type="checkbox" name="pdf-print-background" aria-label="Print background graphics"${state.printBackground ? ' checked' : ''} /> Print background graphics</label>
  <label>Header template<textarea name="pdf-header-template" aria-label="PDF header template">${escapeAttribute(state.headerTemplate)}</textarea></label>
  <label>Footer template<textarea name="pdf-footer-template" aria-label="PDF footer template">${escapeAttribute(state.footerTemplate)}</textarea></label>
  <label><input type="checkbox" name="pdf-prefer-css-page-size" aria-label="Prefer CSS page size"${state.preferCSSPageSize ? ' checked' : ''} /> Prefer CSS page size</label>
  <output aria-live="polite">${escapeAttribute(liveMessage)}</output>
</section>`;
};
exports.renderPdfSettingsMarkup = renderPdfSettingsMarkup;
exports.pdfSettingsFrontComponent = {
    name: 'pdf-settings',
    label: 'PDF Settings',
    description: 'Workspace defaults for generated document PDFs.',
    component: exports.renderPdfSettingsMarkup,
};
