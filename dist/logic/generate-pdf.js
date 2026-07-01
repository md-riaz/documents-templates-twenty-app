"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdfFromHtmlLogic = exports.createPdfStorageKey = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
const pdf_settings_1 = require("./settings/pdf-settings");
const slugify = (value, fallback) => {
    const slug = value
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
};
const safeSegment = (value, fallback) => {
    if (!value)
        return fallback;
    const segment = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return segment || fallback;
};
const timestampForKey = (date) => date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
const createPdfStorageKey = (input) => {
    const now = input.now ?? new Date();
    const ownerSegment = safeSegment(input.generatedDocumentId, 'unsaved');
    const fileSegment = slugify(input.fileName ?? '', 'document');
    return `generated-documents/${ownerSegment}/${timestampForKey(now)}-${fileSegment}.pdf`;
};
exports.createPdfStorageKey = createPdfStorageKey;
const defaultPdfAdapter = {
    async renderHtmlToPdf() {
        throw new Error('No Playwright/Puppeteer PDF adapter configured for this runtime.');
    },
};
const defaultStorageAdapter = {
    async uploadFile() {
        throw new Error('No Twenty file storage adapter configured for PDF uploads.');
    },
};
const updateGeneratedDocument = async (api, generatedDocumentId, data) => {
    if (generatedDocumentId) {
        await api?.updateRecord?.('generatedDocument', generatedDocumentId, data);
    }
};
const generatePdfFromHtmlLogic = async (input) => {
    (0, permission_guards_1.assertPermissionScope)(input.principal, 'generateDocuments');
    const settings = (0, pdf_settings_1.normalizePdfSettings)({ defaults: input.workspaceDefaults, override: input.settings });
    const options = (0, pdf_settings_1.mapPdfSettingsToBrowserOptions)(settings);
    const adapter = input.adapter ?? defaultPdfAdapter;
    const storage = input.storage ?? defaultStorageAdapter;
    const now = input.now ?? new Date();
    const safeBaseName = slugify(input.fileName ?? 'generated-document', 'generated-document');
    const generatedPrefix = input.generatedDocumentId ? `generated-document-${safeSegment(input.generatedDocumentId, 'unsaved')}` : 'generated-document';
    const fileName = `${generatedPrefix}-${safeBaseName}.pdf`;
    const key = (0, exports.createPdfStorageKey)({ generatedDocumentId: input.generatedDocumentId, fileName: safeBaseName, now });
    try {
        const body = await adapter.renderHtmlToPdf({ html: input.html, options });
        const uploaded = await storage.uploadFile({
            key,
            fileName,
            body,
            contentType: 'application/pdf',
            metadata: {
                ...(input.metadata ?? {}),
                generatedDocumentId: input.generatedDocumentId ?? null,
            },
        });
        await updateGeneratedDocument(input.api, input.generatedDocumentId, {
            pdfUrl: uploaded.url,
            status: 'PDF_GENERATED',
            errorMessage: null,
        });
        return {
            ok: true,
            pdfUrl: uploaded.url,
            bytes: body.byteLength,
            status: 'PDF_GENERATED',
            options,
            errors: [],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateGeneratedDocument(input.api, input.generatedDocumentId, {
            status: 'FAILED',
            errorMessage: message,
        });
        return {
            ok: false,
            status: 'FAILED',
            options,
            errors: [{
                    code: 'PDF_GENERATION_ERROR',
                    message,
                    userMessage: 'PDF could not be generated. Try again or contact an administrator.',
                }],
        };
    }
};
exports.generatePdfFromHtmlLogic = generatePdfFromHtmlLogic;
