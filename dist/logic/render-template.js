"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplateLogic = void 0;
const provider_registry_1 = require("./context/provider-registry");
const default_providers_1 = require("./context/default-providers");
const handlebars_renderer_1 = require("./rendering/handlebars-renderer");
const permission_guards_1 = require("../permissions/permission-guards");
const errorOutput = (error, context = {}) => ({
    ok: false,
    html: '',
    context,
    warnings: [],
    errors: [error],
});
const logicError = (code, message, userMessage = message) => ({
    code,
    message,
    userMessage,
});
const normalizeRenderer = (renderer) => String(renderer ?? 'HANDLEBARS').toUpperCase();
const isTemplateActive = (template) => template.isActive === true || String(template.status ?? '').toUpperCase() === 'ACTIVE';
const loadTemplate = async (api, templateId) => {
    const record = await api?.getRecord?.('documentTemplate', templateId);
    return record ?? null;
};
const buildContext = async (input, template) => {
    const context = { ...(input.previewData ?? {}) };
    const warnings = [];
    if (!input.previewData && (input.primaryObjectType || input.primaryRecordId)) {
        if (!input.primaryObjectType || !input.primaryRecordId) {
            return {
                context,
                warnings: ['Both primaryObjectType and primaryRecordId are required to load record context.'],
            };
        }
        const registry = input.registry ?? (0, provider_registry_1.createContextProviderRegistry)({ providers: (0, default_providers_1.createDefaultContextProviders)() });
        const providerInput = {
            primaryObjectType: template.provider || input.primaryObjectType,
            primaryRecordId: input.primaryRecordId,
            api: input.api,
            permissions: input.permissions,
            currentUser: input.currentUser,
            workspace: input.workspace,
        };
        const loaded = await registry.load(providerInput);
        Object.assign(context, loaded.context);
        warnings.push(...loaded.warnings);
    }
    Object.assign(context, input.contextOverrides ?? {});
    return { context, warnings };
};
const mapRenderOutputErrors = (rendered) => rendered.errors.map((error) => ({
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    path: error.path,
    line: error.line,
    column: error.column,
    phase: error.phase,
}));
const renderTemplateLogic = async (input) => {
    if (input.previewData && !input.primaryRecordId) {
        (0, permission_guards_1.assertAnyPermissionScope)(input.principal, ['viewTemplates', 'generateDocuments']);
    }
    else {
        (0, permission_guards_1.assertPermissionScope)(input.principal, 'generateDocuments');
    }
    const template = await loadTemplate(input.api, input.templateId);
    if (!template) {
        return errorOutput(logicError('TEMPLATE_NOT_FOUND', `Document template not found: ${input.templateId}`, 'The selected document template could not be found.'));
    }
    const templateSummary = {
        id: template.id ?? input.templateId,
        name: template.name,
        defaultSubject: template.defaultSubject ?? undefined,
        renderer: template.renderer ?? undefined,
    };
    if (!isTemplateActive(template)) {
        return {
            ...errorOutput(logicError('TEMPLATE_INACTIVE', `Document template is inactive: ${input.templateId}`, 'The selected document template is inactive and cannot be rendered.')),
            template: templateSummary,
        };
    }
    if (!template.htmlSource) {
        return {
            ...errorOutput(logicError('TEMPLATE_RENDER_ERROR', 'Document template has no HTML source.', 'The selected document template has no HTML source to render.')),
            template: templateSummary,
        };
    }
    if (normalizeRenderer(template.renderer) !== 'HANDLEBARS') {
        return {
            ...errorOutput(logicError('UNSUPPORTED_RENDERER', `Unsupported renderer: ${String(template.renderer)}`, 'The selected document template uses a renderer that is not supported by this app version.')),
            template: templateSummary,
        };
    }
    const loadedContext = await buildContext(input, template);
    const rendered = (0, handlebars_renderer_1.renderHandlebarsTemplate)({
        htmlSource: template.htmlSource,
        cssSource: template.cssSource ?? undefined,
        context: loadedContext.context,
        strictMissingVariables: input.strictMissingVariables,
    });
    const errors = mapRenderOutputErrors(rendered);
    return {
        ok: errors.length === 0,
        html: rendered.html,
        context: rendered.context,
        warnings: [...loadedContext.warnings, ...rendered.warnings],
        errors,
        template: templateSummary,
    };
};
exports.renderTemplateLogic = renderTemplateLogic;
