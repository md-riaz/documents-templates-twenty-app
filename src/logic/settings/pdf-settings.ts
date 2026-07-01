export type PdfPageFormat = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
export type PdfOrientation = 'portrait' | 'landscape';

export type PdfSettings = {
  format: PdfPageFormat;
  orientation: PdfOrientation;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  printBackground: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  preferCSSPageSize: boolean;
};

export type PdfSettingsInput = Partial<PdfSettings>;

export type BrowserPdfOptions = {
  format: PdfPageFormat;
  landscape: boolean;
  printBackground: boolean;
  margin: { top: string; right: string; bottom: string; left: string };
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  preferCSSPageSize: boolean;
};

const SUPPORTED_FORMATS = new Set<PdfPageFormat>(['A4', 'Letter', 'Legal', 'A3', 'A5']);
const SUPPORTED_ORIENTATIONS = new Set<PdfOrientation>(['portrait', 'landscape']);
const CSS_LENGTH_PATTERN = /^(0|[0-9]+(?:\.[0-9]+)?)(mm|cm|in|px|pt)$/i;

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  format: 'A4',
  orientation: 'portrait',
  marginTop: '20mm',
  marginRight: '15mm',
  marginBottom: '20mm',
  marginLeft: '15mm',
  printBackground: true,
  headerTemplate: '',
  footerTemplate: '',
  preferCSSPageSize: true,
};

const normalizeFormat = (value: unknown): PdfPageFormat => {
  const candidate = String(value ?? DEFAULT_PDF_SETTINGS.format) as PdfPageFormat;
  return SUPPORTED_FORMATS.has(candidate) ? candidate : DEFAULT_PDF_SETTINGS.format;
};

const normalizeOrientation = (value: unknown): PdfOrientation => {
  const candidate = String(value ?? DEFAULT_PDF_SETTINGS.orientation).toLowerCase() as PdfOrientation;
  return SUPPORTED_ORIENTATIONS.has(candidate) ? candidate : DEFAULT_PDF_SETTINGS.orientation;
};

const normalizeCssLength = (value: unknown, fallback: string): string => {
  const candidate = String(value ?? fallback).trim();
  return CSS_LENGTH_PATTERN.test(candidate) ? candidate : fallback;
};

export const validatePdfSettings = (settings: Partial<PdfSettings>): string[] => {
  const errors: string[] = [];
  if (settings.format !== undefined && !SUPPORTED_FORMATS.has(settings.format as PdfPageFormat)) {
    errors.push(`Unsupported PDF format: ${String(settings.format)}.`);
  }
  if (settings.orientation !== undefined && !SUPPORTED_ORIENTATIONS.has(String(settings.orientation).toLowerCase() as PdfOrientation)) {
    errors.push(`Unsupported PDF orientation: ${String(settings.orientation)}.`);
  }

  const marginLabels: Array<[keyof PdfSettings, string]> = [
    ['marginTop', 'Margin top'],
    ['marginRight', 'Margin right'],
    ['marginBottom', 'Margin bottom'],
    ['marginLeft', 'Margin left'],
  ];
  for (const [key, label] of marginLabels) {
    const value = settings[key];
    if (value !== undefined && !CSS_LENGTH_PATTERN.test(String(value))) {
      errors.push(`${label} must be a positive CSS length such as 10mm, 0.5in, or 24px.`);
    }
  }
  return errors;
};

export const normalizePdfSettings = (input: {
  defaults?: PdfSettingsInput;
  override?: PdfSettingsInput;
} = {}): PdfSettings => {
  const merged = { ...DEFAULT_PDF_SETTINGS, ...(input.defaults ?? {}), ...(input.override ?? {}) };
  return {
    format: normalizeFormat(merged.format),
    orientation: normalizeOrientation(merged.orientation),
    marginTop: normalizeCssLength(merged.marginTop, DEFAULT_PDF_SETTINGS.marginTop),
    marginRight: normalizeCssLength(merged.marginRight, DEFAULT_PDF_SETTINGS.marginRight),
    marginBottom: normalizeCssLength(merged.marginBottom, DEFAULT_PDF_SETTINGS.marginBottom),
    marginLeft: normalizeCssLength(merged.marginLeft, DEFAULT_PDF_SETTINGS.marginLeft),
    printBackground: merged.printBackground ?? DEFAULT_PDF_SETTINGS.printBackground,
    headerTemplate: merged.headerTemplate ?? '',
    footerTemplate: merged.footerTemplate ?? '',
    preferCSSPageSize: merged.preferCSSPageSize ?? DEFAULT_PDF_SETTINGS.preferCSSPageSize,
  };
};

export const mapPdfSettingsToBrowserOptions = (settingsInput: PdfSettingsInput = {}): BrowserPdfOptions => {
  const settings = normalizePdfSettings({ override: settingsInput });
  const hasHeaderFooter = Boolean(settings.headerTemplate || settings.footerTemplate);
  return {
    format: settings.format,
    landscape: settings.orientation === 'landscape',
    printBackground: settings.printBackground,
    margin: {
      top: settings.marginTop,
      right: settings.marginRight,
      bottom: settings.marginBottom,
      left: settings.marginLeft,
    },
    displayHeaderFooter: hasHeaderFooter,
    ...(settings.headerTemplate ? { headerTemplate: settings.headerTemplate } : {}),
    ...(settings.footerTemplate ? { footerTemplate: settings.footerTemplate } : {}),
    preferCSSPageSize: settings.preferCSSPageSize,
  };
};
