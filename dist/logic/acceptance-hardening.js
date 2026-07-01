"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGeneratedDocumentAuditTrail = exports.renderRtlSmokeFixture = exports.sanitizeGeneratedDocumentHtml = exports.runAcceptanceScenario = exports.ACCEPTANCE_SCENARIOS = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
exports.ACCEPTANCE_SCENARIOS = [
    {
        id: 'general-installation',
        title: 'Installation succeeds without metadata errors',
        requiredSignals: ['appInstalled'],
    },
    {
        id: 'general-objects-permissions-settings',
        title: 'Objects, permissions, and persisted settings are available',
        requiredPermissions: ['viewTemplates'],
        requiredSignals: ['objectsRegistered', 'settingsPersist'],
    },
    {
        id: 'template-management-create-edit-preview-list-delete',
        title: 'Template create/edit/preview/list/delete behavior is covered',
        requiredPermissions: ['manageTemplates', 'viewTemplates'],
        requiredSignals: ['templatePreviewOk'],
    },
    {
        id: 'document-generation-single-pdf-save-bulk',
        title: 'Single and bulk document generation save HTML/PDF history',
        requiredPermissions: ['generateDocuments', 'viewGeneratedDocs'],
        requiredSignals: ['generatedDocumentSaved', 'pdfGenerated', 'bulkResultsSaved'],
    },
    {
        id: 'email-sending-attachment-logging-permission',
        title: 'Templated email sends attachments and logs message IDs',
        requiredPermissions: ['sendEmails'],
        requiredSignals: ['emailSent'],
    },
    {
        id: 'workflow-registration-context-error-handling',
        title: 'Workflow actions register and chain with record context',
        requiredSignals: ['workflowActionsRegistered'],
    },
    {
        id: 'ui-accessibility-responsiveness-feedback',
        title: 'UI modals and editor are accessible, responsive, and announce progress',
        requiredSignals: ['uiAccessible'],
    },
    {
        id: 'security-injection-attachment-email-policy',
        title: 'Escaping, storage attachment protection, and email policy boundaries hold',
        requiredPermissions: ['sendEmails', 'generateDocuments'],
        requiredSignals: ['securityEscapingOk'],
    },
];
const scenarioById = (id) => {
    const scenario = exports.ACCEPTANCE_SCENARIOS.find((candidate) => candidate.id === id);
    if (!scenario)
        throw new Error(`Unknown acceptance scenario: ${id}`);
    return scenario;
};
const hasScope = (permissions, scope) => (0, permission_guards_1.hasPermissionScope)({ permissionScopes: permissions }, scope);
const runAcceptanceScenario = async (id, context) => {
    const scenario = scenarioById(id);
    const evidence = [];
    const missing = [];
    for (const scope of scenario.requiredPermissions ?? []) {
        if (hasScope(context.permissions, scope))
            evidence.push(`permission ${scope} present`);
        else
            missing.push(`missing permission ${scope}`);
    }
    for (const signal of scenario.requiredSignals) {
        if (signal === 'objectsRegistered') {
            const objects = new Set(context.objectsRegistered ?? []);
            const required = ['DocumentTemplate', 'TemplateCategory', 'GeneratedDocument'];
            const absent = required.filter((objectName) => !objects.has(objectName));
            if (absent.length)
                missing.push(`objects not registered: ${absent.join(', ')}`);
            else
                evidence.push('required custom objects registered');
            continue;
        }
        if (signal === 'bulkResultsSaved') {
            if ((context.bulkResultsSaved ?? 0) > 0)
                evidence.push(`bulk generation saved ${context.bulkResultsSaved} records`);
            else
                missing.push('bulk generation did not save per-record results');
            continue;
        }
        if (signal === 'workflowActionsRegistered') {
            const actions = new Set(context.workflowActionsRegistered ?? []);
            const required = ['Render Template', 'Generate PDF', 'Send Templated Email'];
            const absent = required.filter((actionName) => !actions.has(actionName));
            if (absent.length)
                missing.push(`workflow actions not registered: ${absent.join(', ')}`);
            else
                evidence.push('workflow actions registered');
            continue;
        }
        if (Boolean(context[signal]))
            evidence.push(`${signal} satisfied`);
        else
            missing.push(`${signal} not satisfied`);
    }
    return { ok: missing.length === 0, scenarioId: id, evidence, missing };
};
exports.runAcceptanceScenario = runAcceptanceScenario;
const sanitizeGeneratedDocumentHtml = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on[a-z]+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*("|')\s*javascript:[^"']*\1/gi, 'href="#blocked"');
exports.sanitizeGeneratedDocumentHtml = sanitizeGeneratedDocumentHtml;
const renderRtlSmokeFixture = (input) => {
    const direction = input.direction ?? 'rtl';
    const escape = (value) => value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    return {
        locale: input.locale,
        direction,
        html: `<!doctype html><html lang="${escape(input.locale)}" dir="${direction}"><body><main><h1>${escape(input.title)}</h1><p>${escape(input.body)}</p></main></body></html>`,
    };
};
exports.renderRtlSmokeFixture = renderRtlSmokeFixture;
const validateGeneratedDocumentAuditTrail = (record) => {
    const required = ['templateId', 'primaryObjectType', 'primaryRecordId', 'renderedHtml', 'status', 'generatedBy', 'generatedAt'];
    const missing = required.filter((key) => record[key] === undefined || record[key] === null || record[key] === '');
    return { ok: missing.length === 0, missing };
};
exports.validateGeneratedDocumentAuditTrail = validateGeneratedDocumentAuditTrail;
