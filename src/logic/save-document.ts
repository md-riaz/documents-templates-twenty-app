import {
  assertPermissionScope,
  type PermissionPrincipal,
} from '../permissions/permission-guards';

export type DocumentStatus = 'RENDERED' | 'PDF_GENERATED' | 'FAILED';

export type DocumentRepositoryApi = {
  createRecord?: (objectName: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type SaveDocumentInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  renderedHtml: string;
  pdfUrl?: string | null;
  status?: DocumentStatus;
  errorMessage?: string | null;
  generatedAt?: string;
  generatedBy?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
  name?: string;
  principal?: PermissionPrincipal;
  currentUser?: Record<string, unknown>;
  api?: DocumentRepositoryApi;
};

export type SaveDocumentOutput = {
  ok: boolean;
  id?: string;
  record?: Record<string, unknown>;
  errors: Array<{ code: string; message: string; userMessage: string }>;
};

const generatedByFromInput = (input: SaveDocumentInput): string | null => {
  if (input.generatedBy) return input.generatedBy;
  const user = input.currentUser;
  const id = user?.id;
  if (typeof id === 'string') return id;
  const displayName = user?.displayName ?? user?.name;
  return typeof displayName === 'string' ? displayName : null;
};

const defaultName = (input: SaveDocumentInput): string => {
  if (input.name) return input.name;
  if (input.primaryObjectType && input.primaryRecordId) {
    return `Document for ${input.primaryObjectType} ${input.primaryRecordId}`;
  }
  return `Document from template ${input.templateId}`;
};

const compactRecord = (record: Record<string, unknown>): Record<string, unknown> => {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) compacted[key] = value;
  }
  return compacted;
};

export const buildDocumentRecord = (input: SaveDocumentInput): Record<string, unknown> => {
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
    status: input.status ?? 'RENDERED',
    errorMessage: input.errorMessage ?? null,
    generatedBy: generatedByFromInput(input),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    metadata: Object.keys(metadata).length ? metadata : null,
  });
};

export const saveDocumentLogic = async (
  input: SaveDocumentInput,
): Promise<SaveDocumentOutput> => {
  assertPermissionScope(input.principal, 'generateDocuments');

  try {
    const data = buildDocumentRecord(input);
    const created = await input.api?.createRecord?.('document', data);
    if (!created) {
      return {
        ok: false,
        errors: [{
          code: 'DOCUMENT_SAVE_ERROR',
          message: 'Document API adapter did not return a created record.',
          userMessage: 'The document could not be saved because the Twenty API adapter is unavailable.',
        }],
      };
    }

    const id = typeof created.id === 'string' && created.id ? created.id : undefined;
    if (!id) {
      return {
        ok: false,
        errors: [{
          code: 'DOCUMENT_SAVE_ERROR',
          message: 'Document API adapter did not return a created record id.',
          userMessage: 'The document could not be saved because Twenty did not return a Document id.',
        }],
      };
    }

    return {
      ok: true,
      id,
      record: created,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [{
        code: 'DOCUMENT_SAVE_ERROR',
        message,
        userMessage: 'The document could not be saved. Try again or contact an administrator.',
      }],
    };
  }
};
