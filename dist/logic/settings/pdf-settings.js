"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPdfSettingsToBrowserOptions = exports.normalizePdfSettings = exports.validatePdfSettings = exports.DEFAULT_PDF_SETTINGS = void 0;
const SUPPORTED_FORMATS = new Set(['A4', 'Letter', 'Legal', 'A3', 'A5']);
const SUPPORTED_ORIENTATIONS = new Set(['portrait', 'landscape']);
const CSS_LENGTH_PATTERN = /^(0|[0-9]+(?:\.[0-9]+)?)(mm|cm|in|px|pt)$/i;
exports.DEFAULT_PDF_SETTINGS = {
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
const normalizeFormat = (value) => {
    const candidate = String(value ?? exports.DEFAULT_PDF_SETTINGS.format);
    return SUPPORTED_FORMATS.has(candidate) ? candidate : exports.DEFAULT_PDF_SETTINGS.format;
};
const normalizeOrientation = (value) => {
    const candidate = String(value ?? exports.DEFAULT_PDF_SETTINGS.orientation).toLowerCase();
    return SUPPORTED_ORIENTATIONS.has(candidate) ? candidate : exports.DEFAULT_PDF_SETTINGS.orientation;
};
const normalizeCssLength = (value, fallback) => {
    const candidate = String(value ?? fallback).trim();
    return CSS_LENGTH_PATTERN.test(candidate) ? candidate : fallback;
};
const validatePdfSettings = (settings) => {
    const errors = [];
    if (settings.format !== undefined && !SUPPORTED_FORMATS.has(settings.format)) {
        errors.push(`Unsupported PDF format: ${String(settings.format)}.`);
    }
    if (settings.orientation !== undefined && !SUPPORTED_ORIENTATIONS.has(String(settings.orientation).toLowerCase())) {
        errors.push(`Unsupported PDF orientation: ${String(settings.orientation)}.`);
    }
    const marginLabels = [
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
exports.validatePdfSettings = validatePdfSettings;
const normalizePdfSettings = (input = {}) => {
    const merged = { ...exports.DEFAULT_PDF_SETTINGS, ...(input.defaults ?? {}), ...(input.override ?? {}) };
    return {
        format: normalizeFormat(merged.format),
        orientation: normalizeOrientation(merged.orientation),
        marginTop: normalizeCssLength(merged.marginTop, exports.DEFAULT_PDF_SETTINGS.marginTop),
        marginRight: normalizeCssLength(merged.marginRight, exports.DEFAULT_PDF_SETTINGS.marginRight),
        marginBottom: normalizeCssLength(merged.marginBottom, exports.DEFAULT_PDF_SETTINGS.marginBottom),
        marginLeft: normalizeCssLength(merged.marginLeft, exports.DEFAULT_PDF_SETTINGS.marginLeft),
        printBackground: merged.printBackground ?? exports.DEFAULT_PDF_SETTINGS.printBackground,
        headerTemplate: merged.headerTemplate ?? '',
        footerTemplate: merged.footerTemplate ?? '',
        preferCSSPageSize: merged.preferCSSPageSize ?? exports.DEFAULT_PDF_SETTINGS.preferCSSPageSize,
    };
};
exports.normalizePdfSettings = normalizePdfSettings;
const mapPdfSettingsToBrowserOptions = (settingsInput = {}) => {
    const settings = (0, exports.normalizePdfSettings)({ override: settingsInput });
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
exports.mapPdfSettingsToBrowserOptions = mapPdfSettingsToBrowserOptions;
