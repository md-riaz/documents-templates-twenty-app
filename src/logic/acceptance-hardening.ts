import { hasPermissionScope, type PermissionPrincipal } from '../permissions/permission-guards';

export type AcceptanceScenarioId =
  | 'general-installation'
  | 'general-objects-permissions-settings'
  | 'template-management-create-edit-preview-list-delete'
  | 'document-generation-single-pdf-save-bulk'
  | 'workflow-registration-context-error-handling'
  | 'ui-accessibility-responsiveness-feedback'
  | 'security-injection-attachment-policy';

export type AcceptanceScenario = {
  id: AcceptanceScenarioId;
  title: string;
  requiredPermissions?: string[];
  requiredSignals: string[];
};

export type AcceptanceContext = {
  permissions?: string[];
  appInstalled?: boolean;
  objectsRegistered?: string[];
  settingsPersist?: boolean;
  templatePreviewOk?: boolean;
  documentSaved?: boolean;
  pdfGenerated?: boolean;
  bulkResultsSaved?: number;
  workflowActionsRegistered?: string[];
  uiAccessible?: boolean;
  securityEscapingOk?: boolean;
};

export const ACCEPTANCE_SCENARIOS: AcceptanceScenario[] = [
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
    requiredPermissions: ['generateDocuments', 'viewDocuments'],
    requiredSignals: ['documentSaved', 'pdfGenerated', 'bulkResultsSaved'],
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
    id: 'security-injection-attachment-policy',
    title: 'Escaping, storage attachment protection, and file attachment boundaries hold',
    requiredPermissions: ['generateDocuments'],
    requiredSignals: ['securityEscapingOk'],
  },
];

const scenarioById = (id: AcceptanceScenarioId): AcceptanceScenario => {
  const scenario = ACCEPTANCE_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown acceptance scenario: ${id}`);
  return scenario;
};

const hasScope = (permissions: string[] | undefined, scope: string): boolean =>
  hasPermissionScope({ permissionScopes: permissions } as PermissionPrincipal, scope as never);

export const runAcceptanceScenario = async (
  id: AcceptanceScenarioId,
  context: AcceptanceContext,
): Promise<{ ok: boolean; scenarioId: AcceptanceScenarioId; evidence: string[]; missing: string[] }> => {
  const scenario = scenarioById(id);
  const evidence: string[] = [];
  const missing: string[] = [];

  for (const scope of scenario.requiredPermissions ?? []) {
    if (hasScope(context.permissions, scope)) evidence.push(`permission ${scope} present`);
    else missing.push(`missing permission ${scope}`);
  }

  for (const signal of scenario.requiredSignals) {
    if (signal === 'objectsRegistered') {
      const objects = new Set(context.objectsRegistered ?? []);
      const required = ['DocumentTemplate', 'TemplateCategory', 'Document'];
      const absent = required.filter((objectName) => !objects.has(objectName));
      if (absent.length) missing.push(`objects not registered: ${absent.join(', ')}`);
      else evidence.push('required custom objects registered');
      continue;
    }

    if (signal === 'bulkResultsSaved') {
      if ((context.bulkResultsSaved ?? 0) > 0) evidence.push(`bulk generation saved ${context.bulkResultsSaved} records`);
      else missing.push('bulk generation did not save per-record results');
      continue;
    }

    if (signal === 'workflowActionsRegistered') {
      const actions = new Set(context.workflowActionsRegistered ?? []);
      const required = ['Render Template', 'Generate PDF', 'Save Document'];
      const absent = required.filter((actionName) => !actions.has(actionName));
      if (absent.length) missing.push(`workflow actions not registered: ${absent.join(', ')}`);
      else evidence.push('workflow actions registered');
      continue;
    }

    if (Boolean(context[signal as keyof AcceptanceContext])) evidence.push(`${signal} satisfied`);
    else missing.push(`${signal} not satisfied`);
  }

  return { ok: missing.length === 0, scenarioId: id, evidence, missing };
};

export const sanitizeDocumentHtml = (html: string): string => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/\s+on[a-z]+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/href\s*=\s*("|')\s*javascript:[^"']*\1/gi, 'href="#blocked"');

export const renderRtlSmokeFixture = (input: {
  locale: string;
  direction?: 'rtl' | 'ltr';
  title: string;
  body: string;
}): { html: string; locale: string; direction: 'rtl' | 'ltr' } => {
  const direction = input.direction ?? 'rtl';
  const escape = (value: string) => value
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

export const validateDocumentAuditTrail = (
  record: Record<string, unknown>,
): { ok: boolean; missing: string[] } => {
  const required = ['templateId', 'primaryObjectType', 'primaryRecordId', 'renderedHtml', 'status', 'generatedBy', 'generatedAt'];
  const missing = required.filter((key) => record[key] === undefined || record[key] === null || record[key] === '');
  return { ok: missing.length === 0, missing };
};
