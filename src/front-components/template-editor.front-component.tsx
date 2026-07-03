import { useEffect, useRef, useState, useCallback } from 'react';

import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { renderHandlebarsTemplate } from '../logic/rendering/handlebars-renderer';
import { createMetadataApi, type MetadataApi } from '../logic/metadata/metadata-client';

declare global {
  interface Window {
    tinymce: any;
  }
}

const TINYMCE_CDN_URL = 'https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js';

/**
 * Loads TinyMCE from the CDN exactly once per page, regardless of how many
 * times the editor mounts/unmounts (e.g. the record page tab switching away
 * and back). Cached at module scope rather than in component state so the
 * promise survives component remounts.
 */
let tinyMceLoadPromise: Promise<void> | null = null;

const loadTinyMce = (): Promise<void> => {
  if (typeof window !== 'undefined' && window.tinymce) {
    return Promise.resolve();
  }
  if (tinyMceLoadPromise) return tinyMceLoadPromise;

  tinyMceLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TINYMCE_CDN_URL;
    script.referrerPolicy = 'origin';
    script.onload = () => resolve();
    script.onerror = () => {
      tinyMceLoadPromise = null;
      reject(new Error('Failed to load the WYSIWYG editor (TinyMCE) from the CDN.'));
    };
    document.head.appendChild(script);
  });
  return tinyMceLoadPromise;
};

export type TemplateEditorTab = 'visual' | 'source';

export type TemplateEditorTemplate = {
  id?: string;
  name: string;
  htmlSource: string;
  previewData?: Record<string, unknown>;
  boundObjectName?: string;
  allowedOutputTypes?: string[];
  status?: string;
  version?: number;
};

export type TemplateEditorState = Required<Omit<TemplateEditorTemplate, 'id' | 'previewData' | 'allowedOutputTypes'>> & {
  id?: string;
  previewJson: string;
  previewData: Record<string, unknown>;
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
  boundObjectName: '',
  allowedOutputTypes: ['HTML', 'PDF'],
  status: 'ACTIVE',
  version: 0,
};

export const createTemplateEditorState = (input: { template?: Partial<TemplateEditorTemplate> } = {}): TemplateEditorState => {
  const template = { ...defaultTemplate, ...(input.template ?? {}) };
  const previewData = template.previewData ?? {};
  return {
    id: template.id,
    name: template.name,
    htmlSource: template.htmlSource,
    previewData,
    previewJson: JSON.stringify(previewData, null, 2),
    boundObjectName: template.boundObjectName ?? '',
    allowedOutputTypes: template.allowedOutputTypes ?? ['HTML'],
    status: template.status ?? 'DRAFT',
    version: template.version ?? 0,
    activeTab: 'visual',
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

const tabs: Array<{ id: TemplateEditorTab; label: string }> = [
  { id: 'visual', label: 'Visual' },
  { id: 'source', label: 'Source' },
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
  boundObjectName: true,
  allowedOutputTypes: true,
  status: true,
  version: true,
};

/** `previewData` is RAW_JSON — coerce whether the client returns a JSON string or an already-parsed value. */
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
    // Name/Bound object/Status/Allowed output types are edited via the native
    // "Fields" tab now, independently of this widget. On update, only send
    // the fields this editor actually owns — including the others here would
    // silently overwrite a concurrent edit made in that tab with a stale
    // in-memory value. A brand-new record (no id yet — not reachable from the
    // live widget, since Twenty always creates the record row before this
    // widget mounts, but used by tests/programmatic callers) still needs them
    // seeded, since `name`/`htmlSource` are non-nullable with no default.
    const result = input.id
      ? await client.mutation({
          updateDocumentTemplate: {
            __args: {
              id: input.id,
              data: {
                htmlSource: input.htmlSource,
                previewData: input.previewData ?? {},
              },
            },
            ...DOCUMENT_TEMPLATE_SELECTION,
          },
        })
      : await client.mutation({
          createDocumentTemplate: {
            __args: {
              data: {
                name: input.name,
                htmlSource: input.htmlSource,
                previewData: input.previewData ?? {},
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

/** TinyMCE configuration shared by every editor instance this widget creates. */
const buildTinyMceConfig = (target: HTMLTextAreaElement, onReady: (editor: any) => void) => ({
  target,
  height: 500,
  menubar: false,
  resize: false,
  plugins: 'code lists table link image searchreplace fullscreen',
  toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | table link | code fullscreen',
  promotion: false,
  branding: false,
  // Templates are raw Handlebars-flavored HTML fragments (not just "rich
  // text") — allow every tag/attribute and don't let TinyMCE "clean up"
  // markup it doesn't recognize, so hand-authored HTML/CSS round-trips
  // untouched.
  valid_elements: '*[*]',
  extended_valid_elements: '*[*]',
  verify_html: false,
  entity_encoding: 'raw',
  convert_urls: false,
  // Handlebars `{{expressions}}` aren't valid HTML on their own; protect them
  // from the HTML parser/serializer so they survive visual-mode edits intact.
  protect: [/\{\{[\s\S]*?\}\}/g],
  content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; }',
  setup: (editor: any) => {
    onReady(editor);
  },
});

export const TemplateEditorComponent = ({ api, template }: TemplateEditorComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const recordId = selectedRecordIds.length === 1 ? selectedRecordIds[0] : undefined;

  const clientRef = useRef<GenqlClientLike | null>(null);
  const client = (clientRef.current ??= new CoreApiClient() as unknown as GenqlClientLike);

  const resolvedApiRef = useRef(api ? null : createCoreTemplateEditorApi(client, createMetadataApi()));
  const resolvedApi = api ?? resolvedApiRef.current!;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [htmlSource, setHtmlSource] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [boundObjectName, setBoundObjectName] = useState('');
  const [allowedOutputTypes, setAllowedOutputTypes] = useState<string[]>(['HTML']);
  const [status, setStatus] = useState('DRAFT');
  const [version, setVersion] = useState(0);

  const [activeTab, setActiveTab] = useState<TemplateEditorTab>('visual');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const textareaElRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlSourceRef = useRef(htmlSource);

  useEffect(() => {
    htmlSourceRef.current = htmlSource;
  }, [htmlSource]);

  useEffect(() => {
    if (!recordId && !template) {
      setIsLoading(false);
      setLoadError('No template record selected.');
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
          setLoadError('Template not found.');
          return;
        }
        setId(tmpl.id);
        setName(tmpl.name);
        setHtmlSource(tmpl.htmlSource);
        setPreviewData(tmpl.previewData ?? {});
        setBoundObjectName(tmpl.boundObjectName ?? '');
        setAllowedOutputTypes(tmpl.allowedOutputTypes ?? ['HTML']);
        setStatus(tmpl.status ?? 'DRAFT');
        setVersion(tmpl.version ?? 0);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(err instanceof Error ? err.message : 'Failed to load template.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  // Initializes/tears down TinyMCE whenever visual mode becomes active (and
  // once the template has finished loading). TinyMCE must target a *native*
  // DOM element created via `document.createElement`, not a React-rendered
  // `<textarea>` — the build's jsx wrapper maps React-rendered HTML tags to
  // custom elements for the remote-DOM worker, and TinyMCE can't attach to
  // those. Creating the textarea manually and appending it to a ref'd
  // container sidesteps that mapping entirely.
  useEffect(() => {
    if (isLoading || loadError || activeTab !== 'visual') return undefined;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    void loadTinyMce()
      .then(() => {
        if (cancelled) return;
        const container = containerRef.current;
        const tinymceGlobal = typeof window !== 'undefined' ? window.tinymce : undefined;
        if (!container || !tinymceGlobal) return;

        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        container.appendChild(textarea);
        textareaElRef.current = textarea;

        tinymceGlobal.init(
          buildTinyMceConfig(textarea, (editor: any) => {
            editorRef.current = editor;
            editor.on('init', () => {
              if (cancelled) return;
              editor.setContent(htmlSourceRef.current || '');
              const editorContainer = editor.getContainer();
              if (editorContainer && container) {
                const syncHeight = () => {
                  const h = container.clientHeight;
                  if (h > 0) editorContainer.style.height = `${h}px`;
                };
                syncHeight();
                resizeObserver = new ResizeObserver(syncHeight);
                resizeObserver.observe(container);
              }
            });
          }),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatusIsError(true);
          setStatusMessage(err instanceof Error ? err.message : 'Failed to load the WYSIWYG editor.');
        }
      });

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      const editor = editorRef.current;
      if (editor) {
        try {
          editor.remove();
        } catch {
          // Ignore teardown errors from an editor that may already be mid-destroy.
        }
        editorRef.current = null;
      }
      const textarea = textareaElRef.current;
      if (textarea?.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      textareaElRef.current = null;
    };
  }, [activeTab, isLoading, loadError]);

  const handleToggleTab = useCallback(() => {
    if (activeTab === 'visual') {
      const editor = editorRef.current;
      if (editor) {
        setHtmlSource(editor.getContent());
      }
      setActiveTab('source');
    } else {
      setActiveTab('visual');
    }
  }, [activeTab]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setStatusIsError(false);
    setStatusMessage('');
    try {
      const currentHtmlSource = activeTab === 'visual' && editorRef.current ? editorRef.current.getContent() : htmlSource;
      if (currentHtmlSource !== htmlSource) {
        setHtmlSource(currentHtmlSource);
      }

      const validationErrors = validateTemplateEditorState({
        name,
        htmlSource: currentHtmlSource,
        previewJson: JSON.stringify(previewData ?? {}),
      });
      if (validationErrors.length) {
        setStatusIsError(true);
        setStatusMessage(validationErrors.join(' '));
        return;
      }

      const saved = await resolvedApi.saveTemplate({
        id,
        name,
        htmlSource: currentHtmlSource,
        previewData: previewData ?? {},
        boundObjectName,
        allowedOutputTypes,
        status,
        version,
      });

      setId(saved.id);
      setVersion(saved.version ?? version);
      setStatusIsError(false);
      setStatusMessage(saved.version ? `Saved version ${saved.version}.` : 'Saved.');
    } catch (err) {
      setStatusIsError(true);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, htmlSource, name, previewData, id, boundObjectName, allowedOutputTypes, status, version, resolvedApi]);

  if (isLoading) {
    return (
      <section aria-label="Template editor" aria-busy="true" style={{ padding: 16 }}>
        <p style={{ color: '#475467' }}>Loading template…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section aria-label="Template editor" style={{ padding: 16 }}>
        <p style={{ color: '#b42318' }}>{loadError}</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Template editor"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480, padding: 16, boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleToggleTab}
          aria-label={activeTab === 'visual' ? 'Switch to source code view' : 'Switch to visual editor'}
          title={activeTab === 'visual' ? 'Switch to source code view' : 'Switch to visual editor'}
          style={{
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 500,
            border: '1px solid #d0d5dd',
            borderRadius: 4,
            background: '#fff',
            color: '#344054',
            cursor: 'pointer',
          }}
        >
          {activeTab === 'visual' ? 'View Source' : 'Visual Editor'}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          aria-label="Save template"
          style={{
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid #1570ef',
            borderRadius: 4,
            background: isSaving ? '#a7c8f7' : '#1570ef',
            color: '#fff',
            cursor: isSaving ? 'default' : 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {statusMessage ? (
        <output
          aria-live="polite"
          style={{ display: 'block', marginBottom: 8, fontSize: 13, color: statusIsError ? '#b42318' : '#067647' }}
        >
          {statusMessage}
        </output>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'visual' ? (
          <div
            ref={containerRef}
            aria-label="Visual template editor"
            style={{ flex: 1, minHeight: 0, border: '1px solid #d0d5dd', borderRadius: 4, overflow: 'hidden' }}
          />
        ) : (
          <textarea
            aria-label="Template HTML source"
            value={htmlSource}
            onChange={(e) => setHtmlSource(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              minHeight: 0,
              resize: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 13,
              lineHeight: 1.5,
              padding: 12,
              background: '#1d2939',
              color: '#e4e7ec',
              border: '1px solid #344054',
              borderRadius: 4,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
    </section>
  );
};

export default defineFrontComponent({
  universalIdentifier: TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'template-preview',
  description: 'A WYSIWYG/source editor for the document template\'s HTML source.',
  component: TemplateEditorComponent,
});
