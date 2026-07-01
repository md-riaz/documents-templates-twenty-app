"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGeneratedDocumentLogic = exports.buildGeneratedDocumentRecord = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
const generatedByFromInput = (input) => {
    if (input.generatedBy)
        return input.generatedBy;
    const user = input.currentUser;
    const id = user?.id;
    if (typeof id === 'string')
        return id;
    const displayName = user?.displayName ?? user?.name;
    return typeof displayName === 'string' ? displayName : null;
};
const defaultName = (input) => {
    if (input.name)
        return input.name;
    if (input.primaryObjectType && input.primaryRecordId) {
        return `Generated document for ${input.primaryObjectType} ${input.primaryRecordId}`;
    }
    return `Generated document from template ${input.templateId}`;
};
const compactRecord = (record) => {
    const compacted = {};
    for (const [key, value] of Object.entries(record)) {
        if (value !== undefined)
            compacted[key] = value;
    }
    return compacted;
};
const buildGeneratedDocumentRecord = (input) => {
    const metadata = {
        ...(input.metadata ?? {}),
        ...(input.warnings?.length ? { warnings: input.warnings } : {}),
    };
    return compactRecord({
        name: defaultName(input),
        templateId: input.templateId,
        primaryObjectType: input.primaryObjectType ?? null,
        primaryRecordId: input.primaryRecordId ?? null,
        renderedHtml: input.renderedHtml,
        pdfUrl: input.pdfUrl ?? null,
        emailSentAt: input.emailSentAt ?? null,
        emailMessageId: input.emailMessageId ?? null,
        status: input.status ?? 'RENDERED',
        errorMessage: input.errorMessage ?? null,
        generatedBy: generatedByFromInput(input),
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        metadata: Object.keys(metadata).length ? metadata : null,
    });
};
exports.buildGeneratedDocumentRecord = buildGeneratedDocumentRecord;
const saveGeneratedDocumentLogic = async (input) => {
    (0, permission_guards_1.assertPermissionScope)(input.principal, 'generateDocuments');
    try {
        const data = (0, exports.buildGeneratedDocumentRecord)(input);
        const created = await input.api?.createRecord?.('generatedDocument', data);
        if (!created) {
            return {
                ok: false,
                errors: [{
                        code: 'GENERATED_DOCUMENT_SAVE_ERROR',
                        message: 'GeneratedDocument API adapter did not return a created record.',
                        userMessage: 'The generated document could not be saved because the Twenty API adapter is unavailable.',
                    }],
            };
        }
        return {
            ok: true,
            id: typeof created.id === 'string' ? created.id : undefined,
            record: created,
            errors: [],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            errors: [{
                    code: 'GENERATED_DOCUMENT_SAVE_ERROR',
                    message,
                    userMessage: 'The generated document could not be saved. Try again or contact an administrator.',
                }],
        };
    }
};
exports.saveGeneratedDocumentLogic = saveGeneratedDocumentLogic;
