import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';

import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { renderHandlebarsTemplate } from '../logic/rendering/handlebars-renderer';
import { createMetadataApi, type MetadataApi } from '../logic/metadata/metadata-client';
import { listBoundObjectFields } from '../logic/list-template-variables';
import { listTemplateVariablesLogic } from '../logic/list-template-variables';

export type TemplateEditorTab = 'html' | 'preview';

export type TemplateEditorVariable = {
  path: string;
  label?: string;
  required?: boolean;
};

export type TemplateEditorTemplate = {
  id?: string;
  name: string;
  htmlSource: string;
  previewData?: Record<string, unknown>;
  variables?: TemplateEditorVariable[];
  boundObjectName?: string;
  allowedOutputTypes?: string[];
  status?: string;
  version?: number;
};

export type TemplateEditorState = Required<Omit<TemplateEditorTemplate, 'id' | 'previewData' | 'variables' | 'allowedOutputTypes'>> & {
  id?: string;
  previewJson: string;
  previewData: Record<string, unknown>;
  variables: TemplateEditorVariable[];
  allowedOutputTypes: string[];
  activeTab: TemplateEditorTab;
  previewHtml: string;
  warnings: string[];
  validationErrors: string[];
  statusMessage: string;
  originalHtmlSource: string;
};

export type TemplateEditorApi = {
  renderPreview(input: { htmlSource: string; previewData: Record<string, unknown> }): Promise<{ ok: boolean; html: string; warnings: string[]; errors: Array<{ userMessage?: string; message?: string }> }>;
  saveTemplate(input: TemplateEditorTemplate): Promise<TemplateEditorTemplate>;
  createTemplateVersion(input: { templateId: string; versionNumber: number; htmlSource: string; name: string }): Promise<unknown>;
  /**
   * Live, schema-backed field list for the template's bound object (standard
   * or custom), from the metadata client. Optional — falls back to an empty
   * list (variable picker then only shows variables already referenced in the
   * template source).
   */
  listFields?(objectNameSingular: string): Promise<TemplateEditorVariable[]>;
  /**
   * Best-effort write-time check that `boundObjectName` names a real Twenty
   * object, using live metadata. Optional — when omitted, `save()` skips the
   * check (matches existing behavior for callers/tests that inject their own
   * `api` without this method).
   */
  validateBoundObjectName?(name: string): Promise<{ ok: boolean; message?: string }>;
};

const defaultTemplate: TemplateEditorTemplate = {
  name: '',
  htmlSource: '',
  previewData: {},
  variables: [],
  boundObjectName: '',
  allowedOutputTypes: ['HTML', 'PDF'],
  status: 'ACTIVE',
  version: 0,
};

const escapeAttribute = (value: unknown): string =>
  String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const createTemplateEditorState = (input: { template?: Partial<TemplateEditorTemplate> } = {}): TemplateEditorState => {
  const template = { ...defaultTemplate, ...(input.template ?? {}) };
  const previewData = template.previewData ?? {};
  return {
    id: template.id,
    name: template.name,
    htmlSource: template.htmlSource,
    previewData,
    previewJson: JSON.stringify(previewData, null, 2),
    variables: template.variables ?? [],
    boundObjectName: template.boundObjectName ?? '',
    allowedOutputTypes: template.allowedOutputTypes ?? ['HTML'],
    status: template.status ?? 'DRAFT',
    version: template.version ?? 0,
    activeTab: 'html',
    previewHtml: '',
    warnings: [],
    validationErrors: [],
    statusMessage: '',
    originalHtmlSource: template.htmlSource,
  };
};

export const validateTemplateEditorState = (state: Pick<TemplateEditorState, 'name' | 'htmlSource' | 'previewJson'>): string[] => {
  const errors: string[] = [];
  if (!state.name.trim()) errors.push('Set a Name in the Fields tab before saving.');
  if (!state.htmlSource.trim()) errors.push('HTML source is required.');
  try {
    JSON.parse(state.previewJson || '{}');
  } catch {
    errors.push('Preview JSON is not valid JSON.');
  }
  return errors;
};

/**
 * Merges "already referenced in the template" variables with "available from
 * the bound object's schema" fields for the variable-insertion picker,
 * de-duplicated by path (referenced entries take precedence for label/metadata).
 */
export const mergeTemplateVariables = (
  referenced: TemplateEditorVariable[],
  available: TemplateEditorVariable[],
): TemplateEditorVariable[] => {
  const merged = new Map<string, TemplateEditorVariable>();
  for (const variable of available) merged.set(variable.path, variable);
  for (const variable of referenced) merged.set(variable.path, variable);
  return Array.from(merged.values());
};

export const insertVariableExpression = (value: string, variablePath: string, cursor: number): { value: string; cursor: number } => {
  const expression = `{{${variablePath}}}`;
  return {
    value: `${value.slice(0, cursor)}${expression}${value.slice(cursor)}`,
    cursor: cursor + expression.length,
  };
};

const tabs: Array<{ id: TemplateEditorTab; label: string }> = [
  { id: 'html', label: 'HTML' },
  { id: 'preview', label: 'Preview JSON' },
];

export const renderTemplateEditorMarkup = (_state: TemplateEditorState): string => `
<section class="template-editor" aria-label="Template preview">
  <div aria-busy="true">Loading preview…</div>
</section>`;

export const templateEditorFrontComponent = {
  name: 'template-preview',
  label: 'Template Preview',
  description: 'Renders a live preview of the document template.',
  component: renderTemplateEditorMarkup,
};

export class TemplateEditorController {
  public state: TemplateEditorState;
  public readonly api: TemplateEditorApi;
  private readonly debounceMs: number;
  private previewTimer?: ReturnType<typeof setTimeout>;
  private pendingPreview?: Promise<void>;

  constructor(options: { initialState?: TemplateEditorState; api: TemplateEditorApi; debounceMs?: number }) {
    this.state = options.initialState ?? createTemplateEditorState();
    this.api = options.api;
    this.debounceMs = options.debounceMs ?? 250;
  }

  updateField(field: keyof TemplateEditorState, value: unknown): void {
    this.state = { ...this.state, [field]: value } as TemplateEditorState;
    if (['htmlSource', 'previewJson'].includes(String(field))) {
      this.schedulePreview();
    }
  }

  private schedulePreview(): void {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.pendingPreview = new Promise((resolve) => {
      this.previewTimer = setTimeout(() => {
        void this.runPreview().then(resolve);
      }, this.debounceMs);
    });
  }

  private async runPreview(): Promise<void> {
    const validationErrors = validateTemplateEditorState(this.state);
    if (validationErrors.length) {
      this.state = { ...this.state, validationErrors, previewHtml: '' };
      return;
    }

    const previewData = JSON.parse(this.state.previewJson || '{}') as Record<string, unknown>;
    const result = await this.api.renderPreview({ htmlSource: this.state.htmlSource, previewData });
    this.state = {
      ...this.state,
      previewData,
      previewHtml: result.ok ? result.html : '',
      warnings: result.warnings ?? [],
      validationErrors: result.ok ? [] : result.errors.map((error) => error.userMessage ?? error.message ?? 'Template preview failed.'),
    };
  }

  async flushPreview(): Promise<void> {
    if (this.pendingPreview) await this.pendingPreview;
  }

  async save(): Promise<{ ok: true; template: TemplateEditorTemplate } | { ok: false; errors: string[] }> {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = undefined;
      this.pendingPreview = undefined;
    }

    const validationErrors = validateTemplateEditorState(this.state);
    if (validationErrors.length) {
      this.state = { ...this.state, validationErrors };
      return { ok: false, errors: validationErrors };
    }

    if (this.state.boundObjectName && this.api.validateBoundObjectName) {
      const boundObjectValidation = await this.api.validateBoundObjectName(this.state.boundObjectName);
      if (!boundObjectValidation.ok) {
        const errors = [boundObjectValidation.message ?? `"${this.state.boundObjectName}" is not a valid Twenty object name.`];
        this.state = { ...this.state, validationErrors: errors };
        return { ok: false, errors };
      }
    }

    const sourceChanged = this.state.htmlSource !== this.state.originalHtmlSource;
    const nextVersion = this.state.id && sourceChanged ? this.state.version + 1 : Math.max(this.state.version, 1);
    const previewData = JSON.parse(this.state.previewJson || '{}') as Record<string, unknown>;
    const template = await this.api.saveTemplate({
      id: this.state.id,
      name: this.state.name,
      htmlSource: this.state.htmlSource,
      previewData,
      variables: this.state.variables,
      boundObjectName: this.state.boundObjectName,
      allowedOutputTypes: this.state.allowedOutputTypes,
      status: this.state.status,
      version: nextVersion,
    });

    if (this.state.id && sourceChanged) {
      await this.api.createTemplateVersion({
        templateId: this.state.id,
        versionNumber: nextVersion,
        htmlSource: this.state.htmlSource,
        name: `${this.state.name} v${nextVersion}`,
      });
    }

    this.state = {
      ...this.state,
      id: template.id,
      version: template.version ?? nextVersion,
      previewData,
      validationErrors: [],
      statusMessage: `Saved version ${template.version ?? nextVersion}`,
      originalHtmlSource: this.state.htmlSource,
    };
    return { ok: true, template };
  }

  setActiveTab(tab: TemplateEditorTab): void {
    this.state = { ...this.state, activeTab: tab };
  }

  static reduceKey(state: TemplateEditorState, event: { key: string; target?: string }): TemplateEditorState {
    if (event.target !== 'tabs') return state;
    const index = tabs.findIndex((tab) => tab.id === state.activeTab);
    if (event.key === 'Home') return { ...state, activeTab: tabs[0].id };
    if (event.key === 'End') return { ...state, activeTab: tabs[tabs.length - 1].id };
    if (event.key === 'ArrowRight') return { ...state, activeTab: tabs[(index + 1) % tabs.length].id };
    if (event.key === 'ArrowLeft') return { ...state, activeTab: tabs[(index - 1 + tabs.length) % tabs.length].id };
    return state;
  }
}

/**
 * Fallback preview API with no persistence at all — useful for tests/storybook
 * contexts that don't want a network dependency. NOT used by the live widget
 * (see `createCoreTemplateEditorApi` below).
 */
export const createLocalPreviewTemplateEditorApi = (): TemplateEditorApi => ({
  renderPreview: async ({ htmlSource }) => ({
    ok: true,
    html: htmlSource,
    warnings: [],
    errors: [],
  }),
  saveTemplate: async (input) => ({ ...input, id: input.id ?? 'unsaved', version: input.version ?? 1 }),
  createTemplateVersion: async () => ({}),
});

/** Minimal genql-style surface this file needs from the generated CoreApiClient. */
type GenqlClientLike = {
  query: (request: Record<string, unknown>) => Promise<Record<string, unknown> | null | undefined>;
  mutation: (request: Record<string, unknown>) => Promise<Record<string, unknown> | null | undefined>;
};

const DOCUMENT_TEMPLATE_SELECTION = {
  id: true,
  name: true,
  htmlSource: true,
  previewData: true,
  variables: true,
  boundObjectName: true,
  allowedOutputTypes: true,
  status: true,
  version: true,
};

/** `previewData`/`variables` are RAW_JSON — coerce whether the client returns a JSON string or an already-parsed value. */
const coerceJson = <T,>(value: unknown, fallback: T): T => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T) ?? fallback;
};

export const fetchDocumentTemplate = async (
  client: GenqlClientLike,
  id: string,
): Promise<TemplateEditorTemplate | null> => {
  const result = await client.query({
    documentTemplate: { __args: { filter: { id: { eq: id } } }, ...DOCUMENT_TEMPLATE_SELECTION },
  });
  const record = result?.documentTemplate as Record<string, unknown> | null | undefined;
  if (!record) return null;
  return {
    id: record.id as string,
    name: (record.name as string) ?? '',
    htmlSource: (record.htmlSource as string) ?? '',
    previewData: coerceJson(record.previewData, {}),
    variables: coerceJson(record.variables, []),
    boundObjectName: (record.boundObjectName as string) ?? '',
    allowedOutputTypes: (record.allowedOutputTypes as string[]) ?? ['HTML', 'PDF'],
    status: (record.status as string) ?? 'DRAFT',
    version: (record.version as number) ?? 1,
  };
};

/**
 * Real `TemplateEditorApi` backed directly by Twenty's `CoreApiClient`/metadata
 * client, both of which auto-authenticate inside a front component via the
 * host's `frontComponentHostCommunicationApi.requestAccessTokenRefresh` bridge
 * (confirmed in `twenty-client-sdk`'s generated client source — no manual
 * token handling needed here, matching the pattern already used server-side in
 * `src/logic-functions/core-client-adapters.ts`).
 */
export const createCoreTemplateEditorApi = (client: GenqlClientLike, metadataApi: MetadataApi): TemplateEditorApi => ({
  async renderPreview({ htmlSource, previewData }) {
    const rendered = renderHandlebarsTemplate({ htmlSource, context: previewData });
    return {
      ok: rendered.errors.length === 0,
      html: rendered.html,
      warnings: rendered.warnings,
      errors: rendered.errors,
    };
  },
  async saveTemplate(input) {
    // Name/Renderer/Bound object/Status/Allowed output types are edited via
    // the native "Fields" tab now, independently of this widget. On update,
    // only send the fields this editor actually owns — including the others
    // here would silently overwrite a concurrent edit made in that tab with
    // a stale in-memory value. A brand-new record (no id yet — not reachable
    // from the live widget, since Twenty always creates the record row
    // before this widget mounts, but used by tests/programmatic callers)
    // still needs them seeded, since `name`/`htmlSource` are non-nullable
    // with no default.
    const editorOwnedData = {
      htmlSource: input.htmlSource,
      previewData: input.previewData ?? {},
      variables: input.variables ?? [],
    };
    const result = input.id
      ? await client.mutation({ updateDocumentTemplate: { __args: { id: input.id, data: editorOwnedData }, ...DOCUMENT_TEMPLATE_SELECTION } })
      : await client.mutation({
          createDocumentTemplate: {
            __args: {
              data: {
                ...editorOwnedData,
                name: input.name,
                boundObjectName: input.boundObjectName || null,
                allowedOutputTypes: input.allowedOutputTypes ?? ['HTML', 'PDF'],
                status: input.status ?? 'ACTIVE',
              },
            },
            ...DOCUMENT_TEMPLATE_SELECTION,
          },
        });
    const saved = (result?.updateDocumentTemplate ?? result?.createDocumentTemplate) as Record<string, unknown> | undefined;
    if (!saved) throw new Error('Twenty did not return a saved DocumentTemplate record.');
    return { ...input, id: saved.id as string, version: (saved.version as number) ?? input.version };
  },
  async createTemplateVersion(input) {
    return client.mutation({
      createTemplateVersion: {
        __args: {
          data: {
            templateId: input.templateId,
            versionNumber: input.versionNumber,
            htmlSource: input.htmlSource,
            name: input.name,
          },
        },
        id: true,
      },
    });
  },
  async listFields(objectNameSingular) {
    const fields = await listBoundObjectFields(objectNameSingular, metadataApi);
    return fields.map((field) => ({ path: field.name, label: field.name }));
  },
  async validateBoundObjectName(name) {
    const objects = await metadataApi.listObjects();
    const match = objects.some((object) => object.nameSingular.toLowerCase() === name.toLowerCase());
    return match ? { ok: true } : { ok: false, message: `"${name}" is not a valid Twenty object name.` };
  },
});

export type VariableGroup = {
  label: string;
  variables: Array<{ path: string; label: string; referenced: boolean }>;
};

export const groupVariablesForPicker = (
  available: TemplateEditorVariable[],
  referencedPaths: Set<string>,
): VariableGroup[] => {
  const groups = new Map<string, VariableGroup>();
  for (const variable of available) {
    const parts = variable.path.split('.');
    const groupKey = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { label: groupKey, variables: [] });
    }
    groups.get(groupKey)!.variables.push({
      path: variable.path,
      label: parts[parts.length - 1],
      referenced: referencedPaths.has(variable.path),
    });
  }
  return Array.from(groups.values());
};

const pickerStyles = {
  container: {
    width: 220,
    minWidth: 180,
    borderRight: '1px solid #e4e4e7',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fafafa',
  } satisfies CSSProperties,
  header: {
    padding: '10px 12px 8px',
    borderBottom: '1px solid #e4e4e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  } satisfies CSSProperties,
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#344054',
    letterSpacing: '0.02em',
  } satisfies CSSProperties,
  search: {
    margin: '8px 10px 4px',
    padding: '5px 8px',
    fontSize: 12,
    border: '1px solid #d0d5dd',
    borderRadius: 4,
    outline: 'none',
    width: 'calc(100% - 20px)',
    background: '#fff',
  } satisfies CSSProperties,
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  } satisfies CSSProperties,
  groupLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '10px 12px 4px',
  } satisfies CSSProperties,
  variableButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '4px 12px 4px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 12,
    color: '#344054',
    borderRadius: 0,
    lineHeight: 1.5,
  } satisfies CSSProperties,
  referencedDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#3b82f6',
    flexShrink: 0,
  } satisfies CSSProperties,
  copiedToast: {
    position: 'fixed' as const,
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1d2939',
    color: '#fff',
    fontSize: 12,
    padding: '6px 14px',
    borderRadius: 6,
    zIndex: 9999,
    pointerEvents: 'none' as const,
    whiteSpace: 'nowrap' as const,
  } satisfies CSSProperties,
  emptyState: {
    padding: '16px 12px',
    fontSize: 12,
    color: '#98a2b3',
    textAlign: 'center' as const,
    lineHeight: 1.6,
  } satisfies CSSProperties,
};

export type VariablePickerProps = {
  groups: VariableGroup[];
  onCopy: (path: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
};

export const VariablePicker = ({ groups, onCopy, filter, onFilterChange }: VariablePickerProps) => {
  const lowerFilter = filter.toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      variables: group.variables.filter(
        (v) => v.path.toLowerCase().includes(lowerFilter) || v.label.toLowerCase().includes(lowerFilter),
      ),
    }))
    .filter((group) => group.variables.length > 0);

  return (
    <nav aria-label="Template variables" style={pickerStyles.container}>
      <div style={pickerStyles.header}>
        <span style={pickerStyles.title}>Variables</span>
      </div>
      <input
        type="search"
        placeholder="Filter fields…"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        style={pickerStyles.search}
        aria-label="Filter variables"
      />
      <div style={pickerStyles.list} role="list">
        {filtered.length === 0 ? (
          <p style={pickerStyles.emptyState}>
            {filter ? 'No matching fields.' : 'Set Bound Object in the Fields tab to see available variables.'}
          </p>
        ) : (
          filtered.map((group) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <div style={pickerStyles.groupLabel}>{group.label}</div>
              {group.variables.map((variable) => (
                <button
                  key={variable.path}
                  role="listitem"
                  type="button"
                  style={pickerStyles.variableButton}
                  onClick={() => onCopy(variable.path)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f0f0f3';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                  title={`Copy {{${variable.path}}} to clipboard`}
                  aria-label={`Copy ${variable.path}`}
                >
                  {variable.referenced ? <span style={pickerStyles.referencedDot} aria-label="Referenced" /> : null}
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{variable.label}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </nav>
  );
};

export type TemplateEditorComponentProps = {
  /**
   * Test/override hook — when supplied, the component skips its own record
   * fetch and `CoreApiClient`-backed API and uses this instead. The live
   * widget never receives this prop (Twenty has no prop-injection mechanism
   * for front components), so it always falls through to the real fetch.
   */
  api?: TemplateEditorApi;
  /** Test/override hook — see `api` above; live widget never receives this. */
  template?: Partial<TemplateEditorTemplate>;
};

export const TemplateEditorComponent = ({ api, template }: TemplateEditorComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const recordId = selectedRecordIds.length === 1 ? selectedRecordIds[0] : undefined;

  const clientRef = useRef<GenqlClientLike | null>(null);
  const client = (clientRef.current ??= new CoreApiClient() as unknown as GenqlClientLike);

  const resolvedApiRef = useRef(api ? null : createCoreTemplateEditorApi(client, createMetadataApi()));
  const resolvedApi = api ?? resolvedApiRef.current!;

  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [variableGroups, setVariableGroups] = useState<VariableGroup[]>([]);
  const [variableFilter, setVariableFilter] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(true);

  const handleCopyVariable = useCallback((path: string) => {
    const expression = `{{${path}}}`;
    void navigator.clipboard.writeText(expression).then(() => {
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1500);
    });
  }, []);

  useEffect(() => {
    if (!recordId && !template) {
      setIsLoading(false);
      setErrorMessage('No template record selected.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const tmpl = template
          ? { ...defaultTemplate, ...template }
          : await fetchDocumentTemplate(client, recordId!);
        if (cancelled) return;
        if (!tmpl) {
          setIsLoading(false);
          setErrorMessage('Template not found.');
          return;
        }
        const rendered = await resolvedApi.renderPreview({
          htmlSource: tmpl.htmlSource,
          previewData: tmpl.previewData ?? {},
        });
        if (cancelled) return;
        setPreviewHtml(rendered.html);
        setIsLoading(false);
        if (!rendered.ok) {
          setErrorMessage(rendered.errors.map((e) => e.userMessage ?? e.message ?? '').join(' '));
        }

        const referencedVars = listTemplateVariablesLogic({ htmlSource: tmpl.htmlSource });
        const referencedPaths = new Set(referencedVars.map((v) => v.name));

        if (tmpl.boundObjectName && resolvedApi.listFields) {
          try {
            const schemaFields = await resolvedApi.listFields(tmpl.boundObjectName);
            const merged = mergeTemplateVariables(
              referencedVars.map((v) => ({ path: v.name, label: v.name })),
              schemaFields,
            );
            if (!cancelled) {
              setVariableGroups(groupVariablesForPicker(merged, referencedPaths));
            }
          } catch {
            if (!cancelled) {
              const groups = groupVariablesForPicker(
                referencedVars.map((v) => ({ path: v.name, label: v.name })),
                referencedPaths,
              );
              setVariableGroups(groups);
            }
          }
        } else {
          const groups = groupVariablesForPicker(
            referencedVars.map((v) => ({ path: v.name, label: v.name })),
            referencedPaths,
          );
          if (!cancelled) setVariableGroups(groups);
        }
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load preview.');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  if (isLoading) {
    return (
      <section aria-label="Template preview" aria-busy="true" style={{ padding: 16 }}>
        <p style={{ color: '#475467' }}>Loading preview…</p>
      </section>
    );
  }

  if (errorMessage && !previewHtml) {
    return (
      <section aria-label="Template preview" style={{ padding: 16 }}>
        <p style={{ color: '#b42318' }}>{errorMessage}</p>
      </section>
    );
  }

  return (
    <section aria-label="Template preview" style={{ display: 'flex', height: 'calc(100vh - 160px)', minHeight: 480 }}>
      {showPicker ? (
        <VariablePicker
          groups={variableGroups}
          onCopy={handleCopyVariable}
          filter={variableFilter}
          onFilterChange={setVariableFilter}
        />
      ) : null}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setShowPicker((prev) => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              border: '1px solid #d0d5dd',
              borderRadius: 4,
              background: showPicker ? '#f0f0f3' : '#fff',
              cursor: 'pointer',
              color: '#344054',
              fontWeight: 500,
            }}
            aria-label={showPicker ? 'Hide variable picker' : 'Show variable picker'}
            title={showPicker ? 'Hide variable picker' : 'Show variable picker'}
          >
            {showPicker ? 'Hide Variables' : 'Show Variables'}
          </button>
          <span style={{ fontSize: 12, color: '#98a2b3' }}>
            Click a variable to copy its Handlebars expression
          </span>
        </div>
        <iframe
          aria-label="Template preview"
          title="Template preview"
          srcDoc={previewHtml}
          sandbox=""
          style={{ width: '100%', flex: 1, minHeight: 0, border: '1px solid #d0d5dd', borderRadius: 4, background: '#fff' }}
        />
        {errorMessage ? (
          <output aria-live="polite" style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#b42318' }}>
            {errorMessage}
          </output>
        ) : null}
      </div>
      {copiedPath ? (
        <div style={pickerStyles.copiedToast} role="status" aria-live="polite">
          Copied {`{{${copiedPath}}}`}
        </div>
      ) : null}
    </section>
  );
};

export default defineFrontComponent({
  universalIdentifier: TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'template-preview',
  description: 'Renders a live preview of the document template using its HTML source and preview data.',
  component: TemplateEditorComponent,
});
