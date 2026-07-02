import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { renderHandlebarsTemplate } from '../logic/rendering/handlebars-renderer';
import { createMetadataApi, type MetadataApi } from '../logic/metadata/metadata-client';
import { listBoundObjectFields } from '../logic/list-template-variables';

export type TemplateEditorTab = 'html' | 'css' | 'preview' | 'settings';

export type TemplateEditorVariable = {
  path: string;
  label?: string;
  required?: boolean;
};

export type TemplateEditorTemplate = {
  id?: string;
  name: string;
  htmlSource: string;
  cssSource?: string;
  previewData?: Record<string, unknown>;
  variables?: TemplateEditorVariable[];
  renderer?: string;
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
  originalCssSource: string;
};

export type TemplateEditorApi = {
  renderPreview(input: { htmlSource: string; cssSource: string; previewData: Record<string, unknown> }): Promise<{ ok: boolean; html: string; warnings: string[]; errors: Array<{ userMessage?: string; message?: string }> }>;
  saveTemplate(input: TemplateEditorTemplate): Promise<TemplateEditorTemplate>;
  createTemplateVersion(input: { templateId: string; versionNumber: number; htmlSource: string; cssSource: string; name: string }): Promise<unknown>;
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
  cssSource: '',
  previewData: {},
  variables: [],
  renderer: 'HANDLEBARS',
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
    cssSource: template.cssSource ?? '',
    previewData,
    previewJson: JSON.stringify(previewData, null, 2),
    variables: template.variables ?? [],
    renderer: template.renderer ?? 'HANDLEBARS',
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
    originalCssSource: template.cssSource ?? '',
  };
};

export const validateTemplateEditorState = (state: Pick<TemplateEditorState, 'name' | 'htmlSource' | 'previewJson'>): string[] => {
  const errors: string[] = [];
  if (!state.name.trim()) errors.push('Template name is required.');
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
  { id: 'css', label: 'CSS' },
  { id: 'preview', label: 'Preview JSON' },
  { id: 'settings', label: 'Settings' },
];

export const renderTemplateEditorMarkup = (state: TemplateEditorState): string => `
<section class="template-editor" aria-label="Template editor" data-responsive-layout="split-stack">
  <div role="tablist" aria-label="Template editor tabs">
    ${tabs.map((tab) => `<button role="tab" aria-selected="${state.activeTab === tab.id}" data-tab="${tab.id}">${tab.label}</button>`).join('')}
  </div>
  <label>HTML<textarea aria-label="HTML template source">${escapeAttribute(state.htmlSource)}</textarea></label>
  <label>CSS<textarea aria-label="CSS template source">${escapeAttribute(state.cssSource)}</textarea></label>
  <label>Preview JSON<textarea aria-label="Preview JSON data">${escapeAttribute(state.previewJson)}</textarea></label>
  <aside role="listbox" aria-label="Available template variables">
    ${state.variables.map((variable) => `<button role="option" data-variable="${escapeAttribute(variable.path)}">${escapeAttribute(variable.label ?? variable.path)}</button>`).join('')}
  </aside>
  <output aria-live="polite">${escapeAttribute(state.statusMessage || state.validationErrors.join(' '))}</output>
</section>`;

export const templateEditorFrontComponent = {
  name: 'template-editor',
  label: 'Template Editor',
  description: 'HTML/CSS template editor with preview JSON, settings, live preview, and variable browser.',
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
    if (['htmlSource', 'cssSource', 'previewJson'].includes(String(field))) {
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
    const result = await this.api.renderPreview({ htmlSource: this.state.htmlSource, cssSource: this.state.cssSource, previewData });
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

    const sourceChanged = this.state.htmlSource !== this.state.originalHtmlSource || this.state.cssSource !== this.state.originalCssSource;
    const nextVersion = this.state.id && sourceChanged ? this.state.version + 1 : Math.max(this.state.version, 1);
    const previewData = JSON.parse(this.state.previewJson || '{}') as Record<string, unknown>;
    const template = await this.api.saveTemplate({
      id: this.state.id,
      name: this.state.name,
      htmlSource: this.state.htmlSource,
      cssSource: this.state.cssSource,
      previewData,
      variables: this.state.variables,
      renderer: this.state.renderer,
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
        cssSource: this.state.cssSource,
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
      originalCssSource: this.state.cssSource,
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
  renderPreview: async ({ htmlSource, cssSource }) => ({
    ok: true,
    html: `<style>${cssSource}</style>${htmlSource}`,
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
  cssSource: true,
  previewData: true,
  variables: true,
  renderer: true,
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
    cssSource: (record.cssSource as string) ?? '',
    previewData: coerceJson(record.previewData, {}),
    variables: coerceJson(record.variables, []),
    renderer: (record.renderer as string) ?? 'HANDLEBARS',
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
  async renderPreview({ htmlSource, cssSource, previewData }) {
    // Pure, local Handlebars rendering — no network round-trip needed for a preview.
    const rendered = renderHandlebarsTemplate({ htmlSource, cssSource, context: previewData });
    return {
      ok: rendered.errors.length === 0,
      html: rendered.html,
      warnings: rendered.warnings,
      errors: rendered.errors,
    };
  },
  async saveTemplate(input) {
    const data = {
      name: input.name,
      htmlSource: input.htmlSource,
      cssSource: input.cssSource ?? '',
      previewData: input.previewData ?? {},
      variables: input.variables ?? [],
      renderer: input.renderer ?? 'HANDLEBARS',
      boundObjectName: input.boundObjectName || null,
      allowedOutputTypes: input.allowedOutputTypes ?? ['HTML', 'PDF'],
      status: input.status ?? 'ACTIVE',
    };
    const result = input.id
      ? await client.mutation({ updateDocumentTemplate: { __args: { id: input.id, data }, ...DOCUMENT_TEMPLATE_SELECTION } })
      : await client.mutation({ createDocumentTemplate: { __args: { data }, ...DOCUMENT_TEMPLATE_SELECTION } });
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
            cssSource: input.cssSource,
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

  const controllerRef = useRef<TemplateEditorController | null>(null);
  const controller = (controllerRef.current ??= new TemplateEditorController({
    initialState: createTemplateEditorState({ template }),
    api: api ?? createCoreTemplateEditorApi(client, createMetadataApi()),
  }));

  const [state, setState] = useState<TemplateEditorState>(() => controller.state);
  const [availableFields, setAvailableFields] = useState<TemplateEditorVariable[]>([]);
  const [isLoadingRecord, setIsLoadingRecord] = useState(Boolean(recordId && !template && !api));
  const sync = (): void => setState(controller.state);

  useEffect(() => {
    void controller.flushPreview().then(sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the real DocumentTemplate record for this widget's record id. Twenty
  // has no mechanism to inject `template`/`api` props into a mounted front
  // component (confirmed — the widget config only carries the front
  // component's universal identifier), so this fetch is the only way the
  // editor can learn which record it's actually editing.
  useEffect(() => {
    if (!recordId || template || api) return;
    let cancelled = false;
    setIsLoadingRecord(true);
    void fetchDocumentTemplate(client, recordId).then((record) => {
      if (cancelled) return;
      if (record) controller.state = createTemplateEditorState({ template: record });
      setIsLoadingRecord(false);
      sync();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  // Refresh the schema-backed field picker whenever the bound object changes.
  useEffect(() => {
    let cancelled = false;
    if (!state.boundObjectName || !controller.api.listFields) {
      setAvailableFields([]);
      return;
    }
    void controller.api.listFields(state.boundObjectName).then((fields) => {
      if (!cancelled) setAvailableFields(fields);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.boundObjectName]);

  const updateField = (field: keyof TemplateEditorState, value: unknown): void => {
    controller.updateField(field, value);
    sync();
    void controller.flushPreview().then(sync);
  };

  const setActiveTab = (tab: TemplateEditorTab): void => {
    controller.setActiveTab(tab);
    sync();
  };

  const onTabKeyDown = (event: { key: string }): void => {
    controller.state = TemplateEditorController.reduceKey(controller.state, { key: event.key, target: 'tabs' });
    sync();
  };

  const onSave = async (): Promise<void> => {
    await controller.save();
    sync();
  };

  const fieldLabelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500 };
  const textInputStyle: CSSProperties = { padding: '6px 8px', border: '1px solid #d0d5dd', borderRadius: 4, font: 'inherit' };
  const textAreaStyle: CSSProperties = { ...textInputStyle, width: '100%', minHeight: 220, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' };

  if (isLoadingRecord) {
    return (
      <section aria-label="Template editor" aria-busy="true">
        <p>Loading template…</p>
      </section>
    );
  }

  return (
    <section
      className="template-editor"
      aria-label="Template editor"
      data-responsive-layout="split-stack"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, maxWidth: 720 }}
    >
      <div
        role="tablist"
        aria-label="Template editor tabs"
        onKeyDown={onTabKeyDown}
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e4e7ec' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.id}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: state.activeTab === tab.id ? '2px solid #4b5eff' : '2px solid transparent',
              background: 'transparent',
              fontWeight: state.activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label style={fieldLabelStyle}>
        Name
        <input
          aria-label="Template name"
          value={state.name}
          onChange={(event) => updateField('name', event.target.value)}
          style={textInputStyle}
        />
      </label>

      {state.activeTab === 'html' ? (
        <label style={fieldLabelStyle}>
          HTML
          <textarea
            aria-label="HTML template source"
            value={state.htmlSource}
            onChange={(event) => updateField('htmlSource', event.target.value)}
            style={textAreaStyle}
          />
        </label>
      ) : null}

      {state.activeTab === 'css' ? (
        <label style={fieldLabelStyle}>
          CSS
          <textarea
            aria-label="CSS template source"
            value={state.cssSource}
            onChange={(event) => updateField('cssSource', event.target.value)}
            style={textAreaStyle}
          />
        </label>
      ) : null}

      {state.activeTab === 'preview' ? (
        <label style={fieldLabelStyle}>
          Preview JSON
          <textarea
            aria-label="Preview JSON data"
            value={state.previewJson}
            onChange={(event) => updateField('previewJson', event.target.value)}
            style={textAreaStyle}
          />
        </label>
      ) : null}

      {state.activeTab === 'settings' ? (
        <div aria-label="Template settings" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={fieldLabelStyle}>
            Renderer
            <select
              aria-label="Template renderer"
              value={state.renderer}
              onChange={(event) => updateField('renderer', event.target.value)}
              style={textInputStyle}
            >
              {/* HANDLEBARS is the only renderer supported by the object schema and renderTemplateLogic; do not add options here until a renderer is fully implemented end-to-end. */}
              <option value="HANDLEBARS">Handlebars</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Status
            <select
              aria-label="Template status"
              value={state.status}
              onChange={(event) => updateField('status', event.target.value)}
              style={textInputStyle}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Bound object
            <input
              aria-label="Bound object name"
              placeholder="e.g. company, person, or any custom object name"
              value={state.boundObjectName}
              onChange={(event) => updateField('boundObjectName', event.target.value)}
              style={textInputStyle}
            />
          </label>
        </div>
      ) : null}

      <aside
        role="listbox"
        aria-label="Available template variables"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
      >
        {mergeTemplateVariables(state.variables, availableFields).map((variable) => (
          <button
            key={variable.path}
            type="button"
            role="option"
            aria-selected={false}
            data-variable={variable.path}
            onClick={() => updateField('htmlSource', insertVariableExpression(state.htmlSource, variable.path, state.htmlSource.length).value)}
            style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #d0d5dd', background: '#f9fafb', fontSize: 12, cursor: 'pointer' }}
          >
            {variable.label ?? variable.path}
          </button>
        ))}
      </aside>

      <div style={fieldLabelStyle}>
        Preview
        <iframe
          aria-label="Template live preview"
          title="Template live preview"
          srcDoc={state.previewHtml}
          sandbox=""
          style={{ width: '100%', height: 320, border: '1px solid #d0d5dd', borderRadius: 4, background: '#fff' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => void onSave()}
          style={{ padding: '8px 16px', border: 'none', borderRadius: 4, background: '#4b5eff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          Save template
        </button>
        <output aria-live="polite" style={{ fontSize: 13, color: state.validationErrors.length ? '#b42318' : '#475467' }}>
          {state.statusMessage || state.validationErrors.join(' ')}
        </output>
      </div>
    </section>
  );
};

export default defineFrontComponent({
  universalIdentifier: TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'template-editor',
  description: 'HTML/CSS template editor with live preview, preview JSON, and a schema-backed variable browser.',
  component: TemplateEditorComponent,
});
