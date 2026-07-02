import {
  DEFAULT_PDF_SETTINGS,
  normalizePdfSettings,
  validatePdfSettings,
  type PdfPageFormat,
  type PdfOrientation,
  type PdfSettings,
  type PdfSettingsInput,
} from '../logic/settings/pdf-settings';

export type PdfSettingsState = PdfSettings & {
  statusMessage: string;
};

const escapeAttribute = (value: unknown): string =>
  String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const createPdfSettingsState = (input: { settings?: PdfSettingsInput; statusMessage?: string } = {}): PdfSettingsState => ({
  ...normalizePdfSettings({ defaults: DEFAULT_PDF_SETTINGS, override: input.settings }),
  statusMessage: input.statusMessage ?? '',
} as PdfSettingsState);

export const validatePdfSettingsState = (state: Partial<PdfSettings>): string[] => validatePdfSettings(state);

const selected = (actual: string, expected: string): string => (actual === expected ? ' selected' : '');

export const renderPdfSettingsMarkup = (state: PdfSettingsState): string => {
  const errors = validatePdfSettingsState(state);
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

export const pdfSettingsFrontComponent = {
  name: 'pdf-settings',
  label: 'PDF Settings',
  description: 'Workspace defaults for generated document PDFs.',
  component: renderPdfSettingsMarkup,
};

const PDF_FORMATS: PdfPageFormat[] = ['A4', 'Letter', 'Legal', 'A3', 'A5'];

export type PdfSettingsFieldsProps = {
  settings: PdfSettings;
  onChange: (settings: PdfSettings) => void;
};

/**
 * Real React form controls for the PDF settings. Consumed as a sub-component
 * inside the template editor's Settings tab (it is NOT registered as its own
 * front component). Mirrors the field list of {@link renderPdfSettingsMarkup}.
 */
export const PdfSettingsFields = ({ settings, onChange }: PdfSettingsFieldsProps) => {
  const errors = validatePdfSettingsState(settings);
  const update = (patch: Partial<PdfSettings>): void => onChange({ ...settings, ...patch });

  return (
    <section className="pdf-settings" aria-label="PDF settings">
      <h3>PDF defaults</h3>
      <label>
        Format
        <select
          name="pdf-format"
          aria-label="PDF page format"
          value={settings.format}
          onChange={(event) => update({ format: event.target.value as PdfPageFormat })}
        >
          {PDF_FORMATS.map((format) => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>
      </label>
      <label>
        Orientation
        <select
          name="pdf-orientation"
          aria-label="PDF orientation"
          value={settings.orientation}
          onChange={(event) => update({ orientation: event.target.value as PdfOrientation })}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </label>
      <fieldset>
        <legend>Margins</legend>
        <label>
          Top
          <input
            name="pdf-margin-top"
            aria-label="PDF margin top"
            value={settings.marginTop}
            onChange={(event) => update({ marginTop: event.target.value })}
          />
        </label>
        <label>
          Right
          <input
            name="pdf-margin-right"
            aria-label="PDF margin right"
            value={settings.marginRight}
            onChange={(event) => update({ marginRight: event.target.value })}
          />
        </label>
        <label>
          Bottom
          <input
            name="pdf-margin-bottom"
            aria-label="PDF margin bottom"
            value={settings.marginBottom}
            onChange={(event) => update({ marginBottom: event.target.value })}
          />
        </label>
        <label>
          Left
          <input
            name="pdf-margin-left"
            aria-label="PDF margin left"
            value={settings.marginLeft}
            onChange={(event) => update({ marginLeft: event.target.value })}
          />
        </label>
      </fieldset>
      <label>
        <input
          type="checkbox"
          name="pdf-print-background"
          aria-label="Print background graphics"
          checked={settings.printBackground}
          onChange={(event) => update({ printBackground: event.target.checked })}
        />
        {' '}Print background graphics
      </label>
      <label>
        Header template
        <textarea
          name="pdf-header-template"
          aria-label="PDF header template"
          value={settings.headerTemplate ?? ''}
          onChange={(event) => update({ headerTemplate: event.target.value })}
        />
      </label>
      <label>
        Footer template
        <textarea
          name="pdf-footer-template"
          aria-label="PDF footer template"
          value={settings.footerTemplate ?? ''}
          onChange={(event) => update({ footerTemplate: event.target.value })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          name="pdf-prefer-css-page-size"
          aria-label="Prefer CSS page size"
          checked={settings.preferCSSPageSize}
          onChange={(event) => update({ preferCSSPageSize: event.target.checked })}
        />
        {' '}Prefer CSS page size
      </label>
      {errors.length > 0 ? (
        <output aria-live="polite" role="alert">{errors.join(' ')}</output>
      ) : null}
    </section>
  );
};
