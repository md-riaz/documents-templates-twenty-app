import { useEffect, useRef, useState } from 'react';

import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, enqueueSnackbar, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { GENERATE_DOCUMENT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

// `getAppPath` (the SDK's own path builder) is declared but not part of
// `twenty-sdk/front-component`'s public export surface — only the `AppPath`
// enum is exported. Build the URL ourselves from its confirmed template
// string (`AppPath.RecordShowPage === '/object/:objectNameSingular/:objectRecordId'`).
const recordShowPath = (objectNameSingular: string, objectRecordId: string): string =>
  AppPath.RecordShowPage
    .replace(':objectNameSingular', encodeURIComponent(objectNameSingular))
    .replace(':objectRecordId', encodeURIComponent(objectRecordId));

import { hasPermissionScope, type PermissionPrincipal } from '../permissions/permission-guards';

export type GenerateDocumentTemplate = {
  id: string;
  name: string;
  status?: string | null;
  allowedOutputTypes?: string[];
};

export type DocumentHistoryRecord = {
  id: string;
  primaryObjectType?: string | null;
  primaryRecordId?: string | null;
  templateName?: string | null;
  status?: string | null;
  generatedAt?: string | null;
  generatedBy?: string | null;
  pdfUrl?: string | null;
};

export type GenerateDocumentState = {
  primaryObjectType: string;
  primaryRecordId: string;
  templates: GenerateDocumentTemplate[];
  selectedTemplateId: string;
  previewHtml: string;
  shouldSave: boolean;
  isGenerating: boolean;
  warnings: string[];
  errors: string[];
  statusMessage: string;
  documentId?: string;
  pdfUrl?: string;
};

export type GenerateDocumentApi = {
  listTemplates?: () => Promise<GenerateDocumentTemplate[]>;
  renderTemplate: (input: {
    templateId: string;
    primaryObjectType: string;
    primaryRecordId: string;
    principal?: PermissionPrincipal;
    currentUser?: Record<string, unknown>;
  }) => Promise<{
    ok: boolean;
    html: string;
    warnings?: string[];
    errors?: Array<{ userMessage?: string; message?: string }>;
    template?: { id: string; name?: string };
  }>;
  saveDocument: (input: {
    templateId: string;
    primaryObjectType: string;
    primaryRecordId: string;
    renderedHtml: string;
    status: 'RENDERED';
    warnings?: string[];
    principal?: PermissionPrincipal;
    currentUser?: Record<string, unknown>;
  }) => Promise<{
    ok: boolean;
    id?: string;
    errors?: Array<{ userMessage?: string; message?: string }>;
  }>;
  /**
   * Optional — when supplied, `generate({ generatePdf: true })` calls this
   * after rendering (and saving, if requested) to produce and attach a PDF.
   * Omitted from `createUnavailableGenerateDocumentApi`'s stub, matching the
   * other not-yet-wired-in-this-environment API methods.
   */
  generatePdf?: (input: {
    html: string;
    documentId?: string;
    principal?: PermissionPrincipal;
  }) => Promise<{
    ok: boolean;
    pdfUrl?: string;
    errors?: Array<{ userMessage?: string; message?: string }>;
  }>;
  notify?: (message: { type: 'success' | 'error'; message: string }) => void;
};

export type GenerateDocumentControllerOptions = {
  api: GenerateDocumentApi;
  principal?: PermissionPrincipal;
  currentUser?: Record<string, unknown>;
  initialState: GenerateDocumentState;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const isTemplateSelectable = (template: GenerateDocumentTemplate): boolean =>
  String(template.status ?? '').toUpperCase() === 'ACTIVE';

const firstSelectableTemplateId = (templates: GenerateDocumentTemplate[]): string =>
  templates.find(isTemplateSelectable)?.id ?? '';

export const createGenerateDocumentState = (input: Partial<GenerateDocumentState> & {
  primaryObjectType?: string;
  primaryRecordId?: string;
} = {}): GenerateDocumentState => {
  const templates = input.templates ?? [];
  return {
    primaryObjectType: input.primaryObjectType ?? '',
    primaryRecordId: input.primaryRecordId ?? '',
    templates,
    selectedTemplateId: input.selectedTemplateId ?? firstSelectableTemplateId(templates),
    previewHtml: input.previewHtml ?? '',
    shouldSave: input.shouldSave ?? true,
    isGenerating: input.isGenerating ?? false,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    statusMessage: input.statusMessage ?? '',
    documentId: input.documentId,
    pdfUrl: input.pdfUrl,
  };
};

export const isGenerateDocumentActionVisible = (input: {
  principal?: PermissionPrincipal;
  primaryObjectType?: string;
  primaryRecordId?: string;
}): boolean =>
  Boolean(input.primaryObjectType && input.primaryRecordId && hasPermissionScope(input.principal, 'generateDocuments'));

export const filterDocumentHistory = (input: {
  primaryObjectType: string;
  primaryRecordId: string;
  records: DocumentHistoryRecord[];
}): DocumentHistoryRecord[] => {
  const objectType = input.primaryObjectType.toLowerCase();
  return input.records
    .filter((record) =>
      String(record.primaryObjectType ?? '').toLowerCase() === objectType
      && record.primaryRecordId === input.primaryRecordId,
    )
    .sort((left, right) => String(right.generatedAt ?? '').localeCompare(String(left.generatedAt ?? '')));
};

export const renderDocumentHistoryMarkup = (input: {
  primaryObjectType: string;
  primaryRecordId: string;
  records: DocumentHistoryRecord[];
}): string => {
  const records = filterDocumentHistory(input);
  return `
<section aria-label="Document history">
  <h2>Documents</h2>
  <table>
    <thead><tr><th>Template</th><th>Status</th><th>Generated</th><th>Document</th><th>PDF</th></tr></thead>
    <tbody>
      ${records.map((record) => `
        <tr data-document-id="${escapeHtml(record.id)}">
          <td>${escapeHtml(record.templateName ?? 'Document')}</td>
          <td>${escapeHtml(record.status ?? 'RENDERED')}</td>
          <td>${escapeHtml(record.generatedAt ?? '')}</td>
          <td><a href="${escapeHtml(recordShowPath('document', record.id))}">View Document</a></td>
          <td>${record.pdfUrl ? `<a href="${escapeHtml(record.pdfUrl)}">Open PDF</a>` : '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  ${records.length === 0 ? '<p>No documents for this record yet.</p>' : ''}
</section>`;
};

export const renderGenerateDocumentModalMarkup = (state: GenerateDocumentState): string => {
  const selectableTemplates = state.templates.filter(isTemplateSelectable);
  const saveChecked = state.shouldSave ? ' checked' : '';
  const disabled = state.isGenerating || !state.selectedTemplateId ? ' disabled' : '';
  return `
<section role="dialog" aria-modal="true" aria-label="Generate document" aria-busy="${state.isGenerating}" data-responsive-layout="stack">
  <h2>Generate Document</h2>
  <label>Template
    <select aria-label="Document template" name="templateId">
      ${selectableTemplates.map((template) => `<option value="${escapeHtml(template.id)}"${template.id === state.selectedTemplateId ? ' selected' : ''}>${escapeHtml(template.name)}</option>`).join('')}
    </select>
  </label>
  <label><input type="checkbox" aria-label="Save document"${saveChecked}> Save document history</label>
  <div aria-label="Rendered document preview">${state.previewHtml}</div>
  ${state.errors.length ? `<div role="alert">${escapeHtml(state.errors.join(' '))}</div>` : ''}
  ${state.warnings.length ? `<div role="status">${escapeHtml(state.warnings.join(' '))}</div>` : ''}
  <button type="button"${disabled}>Generate</button>
  <output aria-live="polite">${escapeHtml(state.statusMessage || (state.isGenerating ? 'Generating document…' : ''))}</output>
</section>`;
};

const messagesFromErrors = (errors: Array<{ userMessage?: string; message?: string }> | undefined): string[] =>
  (errors ?? []).map((error) => error.userMessage ?? error.message ?? 'Document generation failed.');

export class GenerateDocumentController {
  public state: GenerateDocumentState;
  private readonly api: GenerateDocumentApi;
  private readonly principal?: PermissionPrincipal;
  private readonly currentUser?: Record<string, unknown>;

  constructor(options: GenerateDocumentControllerOptions) {
    this.api = options.api;
    this.principal = options.principal;
    this.currentUser = options.currentUser;
    this.state = options.initialState;
  }

  async loadTemplates(): Promise<void> {
    const templates = await this.api.listTemplates?.() ?? [];
    this.state = {
      ...this.state,
      templates,
      selectedTemplateId: this.state.selectedTemplateId || firstSelectableTemplateId(templates),
    };
  }

  selectTemplate(templateId: string): void {
    this.state = { ...this.state, selectedTemplateId: templateId, errors: [], statusMessage: '' };
  }

  setShouldSave(shouldSave: boolean): void {
    this.state = { ...this.state, shouldSave };
  }

  async generate(options: { save?: boolean; generatePdf?: boolean } = {}): Promise<{ ok: boolean; documentId?: string; pdfUrl?: string; errors?: string[] }> {
    if (this.state.isGenerating) {
      const errors = ['Document generation is already in progress.'];
      return { ok: false, errors };
    }

    if (!this.state.selectedTemplateId) {
      const errors = ['Select a template before generating a document.'];
      this.state = { ...this.state, errors };
      return { ok: false, errors };
    }

    this.state = { ...this.state, isGenerating: true, errors: [], statusMessage: 'Generating document…' };
    const rendered = await this.api.renderTemplate({
      templateId: this.state.selectedTemplateId,
      primaryObjectType: this.state.primaryObjectType,
      primaryRecordId: this.state.primaryRecordId,
      principal: this.principal,
      currentUser: this.currentUser,
    });

    if (!rendered.ok) {
      const errors = messagesFromErrors(rendered.errors);
      const message = errors[0] ?? 'Document generation failed.';
      this.state = { ...this.state, isGenerating: false, previewHtml: '', errors, statusMessage: message };
      this.api.notify?.({ type: 'error', message });
      return { ok: false, errors };
    }

    const shouldSave = options.save ?? this.state.shouldSave;
    let documentId: string | undefined;
    if (shouldSave) {
      const saved = await this.api.saveDocument({
        templateId: this.state.selectedTemplateId,
        primaryObjectType: this.state.primaryObjectType,
        primaryRecordId: this.state.primaryRecordId,
        renderedHtml: rendered.html,
        status: 'RENDERED',
        warnings: rendered.warnings,
        principal: this.principal,
        currentUser: this.currentUser,
      });
      if (!saved.ok) {
        const errors = messagesFromErrors(saved.errors);
        const message = errors[0] ?? 'Document could not be saved.';
        this.state = { ...this.state, isGenerating: false, previewHtml: rendered.html, warnings: rendered.warnings ?? [], errors, statusMessage: message };
        this.api.notify?.({ type: 'error', message });
        return { ok: false, errors };
      }
      documentId = saved.id;
    }

    let pdfUrl: string | undefined;
    if (options.generatePdf) {
      if (!this.api.generatePdf) {
        const errors = ['PDF generation is not available in this environment.'];
        this.state = { ...this.state, isGenerating: false, previewHtml: rendered.html, warnings: rendered.warnings ?? [], errors, statusMessage: errors[0], documentId };
        this.api.notify?.({ type: 'error', message: errors[0] });
        return { ok: false, documentId, errors };
      }
      const pdf = await this.api.generatePdf({
        html: rendered.html,
        documentId,
        principal: this.principal,
      });
      if (!pdf.ok) {
        const errors = messagesFromErrors(pdf.errors);
        const message = errors[0] ?? 'PDF generation failed.';
        this.state = { ...this.state, isGenerating: false, previewHtml: rendered.html, warnings: rendered.warnings ?? [], errors, statusMessage: message, documentId };
        this.api.notify?.({ type: 'error', message });
        return { ok: false, documentId, errors };
      }
      pdfUrl = pdf.pdfUrl;
    }

    const message = [
      'Document generated',
      shouldSave ? 'and saved' : '',
      options.generatePdf ? 'with PDF' : '',
    ].filter(Boolean).join(' ') + '.';
    this.state = {
      ...this.state,
      isGenerating: false,
      previewHtml: rendered.html,
      warnings: rendered.warnings ?? [],
      errors: [],
      statusMessage: message,
      documentId,
      pdfUrl,
    };
    this.api.notify?.({ type: 'success', message });
    return { ok: true, documentId, pdfUrl };
  }
}

export const generateDocumentFrontComponent = {
  name: 'generate-document-modal',
  label: 'Generate Document Modal',
  description: 'Record action modal for template selection, preview, optional save, and notifications.',
  component: renderGenerateDocumentModalMarkup,
};

export const documentHistoryFrontComponent = {
  name: 'document-history',
  label: 'Document History',
  description: 'Record tab list filtered by primary object and record ID.',
  component: renderDocumentHistoryMarkup,
};

const NOT_WIRED_MESSAGE = 'Document generation API is not connected in this environment yet.';

/**
 * Fallback API used until the real Twenty API wiring (separate workstream) is
 * injected. Keeps the component data-flow intact and compilable.
 */
export const createUnavailableGenerateDocumentApi = (): GenerateDocumentApi => ({
  listTemplates: async () => [],
  renderTemplate: async () => ({ ok: false, html: '', errors: [{ userMessage: NOT_WIRED_MESSAGE }] }),
  saveDocument: async () => ({ ok: false, errors: [{ userMessage: NOT_WIRED_MESSAGE }] }),
});

export type GenerateDocumentComponentProps = {
  /** Injected by the real workstream; falls back to a not-wired stub. */
  api?: GenerateDocumentApi;
  /**
   * Object type of the acting record. The execution context only exposes
   * record ids, so the caller (page layout / command host) supplies this.
   */
  primaryObjectType?: string;
  principal?: PermissionPrincipal;
  currentUser?: Record<string, unknown>;
};

export const GenerateDocumentComponent = ({
  api,
  primaryObjectType = '',
  principal,
  currentUser,
}: GenerateDocumentComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const primaryRecordId = selectedRecordIds.length > 0 ? selectedRecordIds[0] : '';

  const controllerRef = useRef<GenerateDocumentController | null>(null);
  const controller = (controllerRef.current ??= new GenerateDocumentController({
    api: api ?? createUnavailableGenerateDocumentApi(),
    principal,
    currentUser,
    initialState: createGenerateDocumentState({ primaryObjectType, primaryRecordId }),
  }));

  const [state, setState] = useState<GenerateDocumentState>(() => controller.state);
  const [generatePdf, setGeneratePdf] = useState(false);
  const sync = (): void => setState(controller.state);

  // Keep the controller's record context in sync with the host selection.
  useEffect(() => {
    controller.state = { ...controller.state, primaryObjectType, primaryRecordId };
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryObjectType, primaryRecordId]);

  useEffect(() => {
    void controller.loadTemplates().then(sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectableTemplates = state.templates.filter(isTemplateSelectable);
  const canGenerate = !state.isGenerating && Boolean(state.selectedTemplateId) && Boolean(primaryRecordId);

  const onGenerate = async (): Promise<void> => {
    const generation = controller.generate({ save: state.shouldSave, generatePdf });
    sync();
    const result = await generation;
    sync();
    if (result.ok) {
      void enqueueSnackbar({ message: controller.state.statusMessage || 'Document generated.', variant: 'success' });
    } else {
      void enqueueSnackbar({ message: result.errors?.[0] ?? 'Document generation failed.', variant: 'error' });
    }
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Generate document"
      aria-busy={state.isGenerating}
      data-responsive-layout="stack"
    >
      <h2>Generate Document</h2>

      {!primaryRecordId ? (
        <p role="alert">Select a single record to generate a document.</p>
      ) : null}

      <label>
        Template
        <select
          aria-label="Document template"
          name="templateId"
          value={state.selectedTemplateId}
          onChange={(event) => {
            controller.selectTemplate(event.target.value);
            sync();
          }}
        >
          {selectableTemplates.length === 0 ? (
            <option value="">No active templates available</option>
          ) : null}
          {selectableTemplates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          aria-label="Save document"
          checked={state.shouldSave}
          onChange={(event) => {
            controller.setShouldSave(event.target.checked);
            sync();
          }}
        />
        {' '}Save document history
      </label>

      <label>
        <input
          type="checkbox"
          aria-label="Generate PDF"
          checked={generatePdf}
          onChange={(event) => setGeneratePdf(event.target.checked)}
        />
        {' '}Also generate PDF
      </label>

      <iframe
        aria-label="Rendered document preview"
        title="Rendered document preview"
        srcDoc={state.previewHtml}
        sandbox=""
        style={{ width: '100%', minHeight: '320px', border: '1px solid #ddd' }}
      />

      {state.errors.length > 0 ? (
        <div role="alert">{state.errors.join(' ')}</div>
      ) : null}
      {state.warnings.length > 0 ? (
        <div role="status">{state.warnings.join(' ')}</div>
      ) : null}

      <button type="button" disabled={!canGenerate} onClick={() => void onGenerate()}>
        Generate
      </button>

      <output aria-live="polite">
        {state.statusMessage || (state.isGenerating ? 'Generating document…' : '')}
      </output>
    </section>
  );
};

export default defineFrontComponent({
  universalIdentifier: GENERATE_DOCUMENT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'generate-document',
  description: 'Record action to pick a template, preview the rendered document, optionally save it and generate a PDF.',
  component: GenerateDocumentComponent,
});
