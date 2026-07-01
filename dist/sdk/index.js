"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentsTemplatesSdk = exports.registerContextProvider = exports.listTemplates = exports.sendTemplatedEmail = exports.generatePdfFromHtml = exports.renderTemplate = void 0;
const provider_registry_1 = require("../logic/context/provider-registry");
const generate_pdf_1 = require("../logic/generate-pdf");
const render_template_1 = require("../logic/render-template");
const send_templated_email_1 = require("../logic/send-templated-email");
const permission_guards_1 = require("../permissions/permission-guards");
const withRuntimeDefaults = (runtime = {}) => ({
    ...runtime,
    registry: runtime.registry ?? (0, provider_registry_1.createContextProviderRegistry)({ includeDefaultProviders: true }),
});
const renderTemplate = (input, runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    return (0, render_template_1.renderTemplateLogic)({
        ...input,
        principal: resolved.principal,
        api: resolved.api,
        registry: resolved.registry,
        currentUser: resolved.currentUser,
        workspace: resolved.workspace,
    });
};
exports.renderTemplate = renderTemplate;
const generatePdfFromHtml = (input, runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    return (0, generate_pdf_1.generatePdfFromHtmlLogic)({
        ...input,
        principal: resolved.principal,
        api: resolved.api,
    });
};
exports.generatePdfFromHtml = generatePdfFromHtml;
const sendTemplatedEmail = (input, runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    return (0, send_templated_email_1.sendTemplatedEmailLogic)({
        ...input,
        principal: resolved.principal,
        api: resolved.api,
        currentUser: resolved.currentUser,
    });
};
exports.sendTemplatedEmail = sendTemplatedEmail;
const stringOrUndefined = (value) => typeof value === 'string' ? value : undefined;
const booleanOrUndefined = (value) => typeof value === 'boolean' ? value : undefined;
const numberOrUndefined = (value) => typeof value === 'number' ? value : undefined;
const toTemplateSummary = (record) => ({
    id: stringOrUndefined(record.id) ?? '',
    name: stringOrUndefined(record.name) ?? 'Untitled template',
    slug: stringOrUndefined(record.slug),
    status: stringOrUndefined(record.status),
    isActive: booleanOrUndefined(record.isActive),
    renderer: stringOrUndefined(record.renderer),
    defaultSubject: stringOrUndefined(record.defaultSubject),
    category: record.category,
    version: numberOrUndefined(record.version),
});
const fallbackListTemplates = async (input, runtime) => {
    if (!input.search)
        return [];
    const maybeRecord = await runtime.api?.getRecord?.('documentTemplate', input.search);
    if (!maybeRecord)
        return [];
    return [toTemplateSummary(maybeRecord)];
};
const listTemplates = async (input = {}, runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    (0, permission_guards_1.assertAnyPermissionScope)(resolved.principal, ['viewTemplates', 'manageTemplates', 'generateDocuments']);
    const records = await resolved.api?.listRecords?.('documentTemplate', input);
    const summaries = records ? records.map(toTemplateSummary) : await fallbackListTemplates(input, resolved);
    return summaries.filter((template) => {
        if (input.activeOnly && template.isActive === false)
            return false;
        if (input.search) {
            const query = input.search.toLowerCase();
            return template.id.toLowerCase().includes(query)
                || template.name.toLowerCase().includes(query)
                || (template.slug?.toLowerCase().includes(query) ?? false);
        }
        return true;
    }).slice(0, input.limit ?? summaries.length);
};
exports.listTemplates = listTemplates;
const registerContextProvider = (name, provider, runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    (0, provider_registry_1.registerContextProvider)(name, provider, resolved.registry);
    runtime.registry = resolved.registry;
};
exports.registerContextProvider = registerContextProvider;
const createDocumentsTemplatesSdk = (runtime = {}) => {
    const resolved = withRuntimeDefaults(runtime);
    return {
        runtime: resolved,
        renderTemplate(input) {
            return (0, exports.renderTemplate)(input, resolved);
        },
        generatePdfFromHtml(input) {
            return (0, exports.generatePdfFromHtml)(input, resolved);
        },
        sendTemplatedEmail(input) {
            return (0, exports.sendTemplatedEmail)(input, resolved);
        },
        listTemplates(input) {
            return (0, exports.listTemplates)(input, resolved);
        },
    };
};
exports.createDocumentsTemplatesSdk = createDocumentsTemplatesSdk;
