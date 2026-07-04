import { useEffect, useRef, useState, useCallback } from 'react';

import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { Editor } from '@tinymce/tinymce-react';

import { TINYMCE_BETA_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

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

const fetchDocumentTemplate = async (
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

const updateDocumentTemplate = async (
  client: GenqlClientLike,
  id: string,
  htmlSource: string,
): Promise<TemplateEditorTemplate | null> => {
  const result = await client.mutation({
    updateDocumentTemplate: { 
      __args: { 
        filter: { id: { eq: id } }, 
        set: { htmlSource } 
      }, 
      ...DOCUMENT_TEMPLATE_SELECTION 
    },
  });
  const record = result?.updateDocumentTemplate as Record<string, unknown> | null | undefined;
  if (!record) return null;
  return {
    id: record.id as string,
    name: (record.name as string) ?? '',
    htmlSource: (record.htmlSource as string) ?? '',
  };
};

export const TinymceBetaEditorComponent = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const recordId = selectedRecordIds.length === 1 ? selectedRecordIds[0] : undefined;

  const clientRef = useRef<GenqlClientLike | null>(null);
  const client = (clientRef.current ??= new CoreApiClient() as unknown as GenqlClientLike);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [htmlSource, setHtmlSource] = useState('');
  
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!recordId) {
      setIsLoading(false);
      setLoadError('No template record selected.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const tmpl = await fetchDocumentTemplate(client, recordId!);
        if (cancelled) return;
        if (!tmpl) {
          setIsLoading(false);
          setLoadError('Template not found.');
          return;
        }
        setHtmlSource(tmpl.htmlSource);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(err instanceof Error ? err.message : 'Failed to load template.');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const handleSave = useCallback(async () => {
    if (!recordId) return;
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      setIsSaving(true);
      setSaveError('');
      try {
        await updateDocumentTemplate(client, recordId, content);
        setHtmlSource(content);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save.');
      } finally {
        setIsSaving(false);
      }
    }
  }, [recordId]);

  if (isLoading) {
    return (
      <section aria-busy="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '100dvh' }}>
        <p style={{ color: '#475467', fontSize: 14 }}>Loading editor...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '100dvh' }}>
        <p style={{ color: '#b42318', fontSize: 14 }}>{loadError}</p>
      </section>
    );
  }

  return (
    <section
      aria-label="TinyMCE Beta Editor"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'max(480px, calc(100dvh - 200px))' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #eaecf0', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save template"
          style={{
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 500,
            border: '1px solid #d0d5dd',
            borderRadius: 4,
            background: '#fff',
            color: '#344054',
            cursor: 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {saveError && <span style={{ color: '#b42318', fontSize: 12, marginLeft: 8 }}>{saveError}</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          onInit={(_evt, editor) => editorRef.current = editor}
          initialValue={htmlSource}
          init={{
            height: '100%',
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | ' +
              'bold italic forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
          }}
        />
      </div>
    </section>
  );
};

export default defineFrontComponent({
  universalIdentifier: TINYMCE_BETA_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'tinymce-beta-editor',
  description: 'TinyMCE WYSIWYG editor for document templates.',
  component: TinymceBetaEditorComponent,
});
