import {
  assertPermissionScope,
  type PermissionPrincipal,
} from '../permissions/permission-guards';

export type GeneratedDocumentStatus = 'RENDERED' | 'PDF_GENERATED' | 'EMAIL_SENT' | 'FAILED';

export type GeneratedDocumentRepositoryApi = {
  createRecord?: (objectName: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type SaveGeneratedDocumentInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  renderedHtml: string;
  pdfUrl?: string | null;
  emailSentAt?: string | null;
  emailMessageId?: string | null;
  status?: GeneratedDocumentStatus;
  errorMessage?: string | null;
  generatedAt?: string;
  generatedBy?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
  name?: string;
  principal?: PermissionPrincipal;
  currentUser?: Record<string, unknown>;
  api?: GeneratedDocumentRepositoryApi;
};

export type SaveGeneratedDocumentOutput = {
  ok: boolean;
  id?: string;
  record?: Record<string, unknown>;
  errors: Array<{ code: string; message: string; userMessage: string }>;
};

const generatedByFromInput = (input: SaveGeneratedDocumentInput): string | null => {
  if (input.generatedBy) return input.generatedBy;
  const user = input.currentUser;
  const id = user?.id;
  if (typeof id === 'string') return id;
  const displayName = user?.displayName ?? user?.name;
  return typeof displayName === 'string' ? displayName : null;
};

const defaultName = (input: SaveGeneratedDocumentInput): string => {
  if (input.name) return input.name;
  if (input.primaryObjectType && input.primaryRecordId) {
    return `Generated document for ${input.primaryObjectType} ${input.primaryRecordId}`;
  }
  return `Generated document from template ${input.templateId}`;
};

const compactRecord = (record: Record<string, unknown>): Record<string, unknown> => {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) compacted[key] = value;
  }
  return compacted;
};

export const buildGeneratedDocumentRecord = (input: SaveGeneratedDocumentInput): Record<string, unknown> => {
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
    emailSentAt: input.emailSentAt ?? null,
    emailMessageId: input.emailMessageId ?? null,
    status: input.status ?? 'RENDERED',
    errorMessage: input.errorMessage ?? null,
    generatedBy: generatedByFromInput(input),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    metadata: Object.keys(metadata).length ? metadata : null,
  });
};

export const saveGeneratedDocumentLogic = async (
  input: SaveGeneratedDocumentInput,
): Promise<SaveGeneratedDocumentOutput> => {
  assertPermissionScope(input.principal, 'generateDocuments');

  try {
    const data = buildGeneratedDocumentRecord(input);
    const created = await input.api?.createRecord?.('generatedDocument', data);
    if (!created) {
      return {
        ok: false,
        errors: [{
          code: 'GENERATED_DOCUMENT_SAVE_ERROR',
          message: 'GeneratedDocument API adapter did not return a created record.',
          userMessage: 'The generated document could not be saved because the Twenty API adapter is unavailable.',
        }],
      };
    }

    return {
      ok: true,
      id: typeof created.id === 'string' ? created.id : undefined,
      record: created,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [{
        code: 'GENERATED_DOCUMENT_SAVE_ERROR',
        message,
        userMessage: 'The generated document could not be saved. Try again or contact an administrator.',
      }],
    };
  }
};
