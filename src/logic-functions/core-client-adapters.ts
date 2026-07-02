import { CoreApiClient } from 'twenty-client-sdk/core';
import type { MetadataApiClient } from 'twenty-client-sdk/metadata';
import type { PdfStorageAdapter } from '../logic/generate-pdf';
import type { PermissionPrincipal } from '../permissions/permission-guards';
import { TWENTY_ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

/**
 * Logic functions run inside Twenty with an already-authorized workspace context
 * (the app's default role gates whether the workflow step is available at all).
 * The injected logic (renderTemplateLogic / generatePdfFromHtmlLogic /
 * saveGeneratedDocumentLogic) still asserts a principal, so we supply one carrying
 * the scopes those functions require.
 */
export const WORKFLOW_ACTION_PRINCIPAL: PermissionPrincipal = {
  permissionScopes: ['generateDocuments', 'viewTemplates'],
};

/**
 * Minimal genql-style surface of the generated CoreApiClient. The real client is
 * generated per Twenty instance (its query/mutation/upload members are typed `any`),
 * so we narrow it to the calls we actually issue.
 */
export type GenqlRequest = Record<string, unknown>;
export type GenqlClientLike = {
  query: (request: GenqlRequest) => Promise<Record<string, unknown> | null | undefined>;
  mutation: (request: GenqlRequest) => Promise<Record<string, unknown> | null | undefined>;
};

const asGenql = (client: CoreApiClient): GenqlClientLike => client as unknown as GenqlClientLike;

const capitalize = (value: string): string => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value);

/**
 * Bridges the generated CoreApiClient into the record-repository interface shared by
 * the injected logic:
 *  - `getRecord`      -> TemplateRepositoryApi (render-template) + context providers
 *  - `createRecord`   -> GeneratedDocumentRepositoryApi (save-generated-document)
 *  - `updateRecord`   -> GeneratedDocumentUpdateApi (generate-pdf)
 *
 * All three read/write generic records via genql-style selections. `__scalar: true`
 * selects every scalar field of the object so we can return an untyped record.
 */
export type CoreRecordApi = {
  getRecord: (objectName: string, id: string) => Promise<Record<string, unknown> | null>;
  createRecord: (objectName: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateRecord: (objectName: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export const createCoreRecordApi = (client: CoreApiClient): CoreRecordApi => {
  const genql = asGenql(client);
  return {
    async getRecord(objectName, id) {
      const result = await genql.query({
        [objectName]: {
          __args: { filter: { id: { eq: id } } },
          __scalar: true,
        },
      });
      const record = result?.[objectName];
      return (record as Record<string, unknown> | null | undefined) ?? null;
    },
    async createRecord(objectName, data) {
      const field = `create${capitalize(objectName)}`;
      const result = await genql.mutation({
        [field]: {
          __args: { data },
          __scalar: true,
        },
      });
      return (result?.[field] as Record<string, unknown>) ?? ({} as Record<string, unknown>);
    },
    async updateRecord(objectName, id, data) {
      const field = `update${capitalize(objectName)}`;
      const result = await genql.mutation({
        [field]: {
          __args: { id, data },
          __scalar: true,
        },
      });
      return (result?.[field] as Record<string, unknown>) ?? ({} as Record<string, unknown>);
    },
  };
};

/**
 * PDF storage adapter backed by Twenty's native clients.
 *
 * CONFIRMED LIVE against a real workspace (this is not a guess from package types):
 * there is NO generic `uploadFile`/file-upload mutation on the Core GraphQL API — the
 * only file-upload entry points are `MetadataApiClient.uploadFile(buffer, filename,
 * contentType, fieldMetadataUniversalIdentifier)` (documented at
 * docs.twenty.com/developers/extend/apps/logic/logic-functions), which uploads bytes
 * into a specific FILES-type *field* and returns `{ id, path, size, createdAt, url }`.
 * An earlier version of this file invented a fictional `Mutation.uploadFile` genql call
 * (copied from a pre-existing, never-verified `../adapters/twenty-storage.adapter.ts`)
 * which fails at runtime with "type Mutation does not have a field uploadFile".
 *
 * The correct two-step flow, confirmed live:
 *  1. `metadataClient.uploadFile(buffer, fileName, contentType,
 *     TWENTY_ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER)` — Twenty's built-in
 *     `Attachment.file` field is itself FILES-type, so we upload into that field's
 *     bucket (not one of our own objects) to get a `fileId`.
 *  2. `coreClient.mutation({ createAttachment: { data: { file: [{ fileId, label }],
 *     ... } } })` — `AttachmentCreateInput.file` is `[FileItemInput]` = `{ fileId,
 *     label }` (NOT `{ url, name, id }`, which is also a fictional shape from the
 *     same unverified adapter).
 */
const RECORD_TYPE_FIELD_MAP: Record<string, string> = {
  company: 'targetCompanyId',
  person: 'targetPersonId',
  opportunity: 'targetOpportunityId',
  task: 'targetTaskId',
  note: 'targetNoteId',
  calendarEvent: 'targetCalendarEventId',
  generatedDocument: 'targetGeneratedDocumentId',
  documentTemplate: 'targetDocumentTemplateId',
  workflow: 'targetWorkflowId',
  workflowVersion: 'targetWorkflowVersionId',
  workflowRun: 'targetWorkflowRunId',
  dashboard: 'targetDashboardId',
};

const getAttachmentField = (objectName: string): string | undefined => RECORD_TYPE_FIELD_MAP[objectName.toLowerCase()];

export type MetadataUploadClientLike = {
  uploadFile: (
    fileBuffer: Buffer,
    filename: string,
    contentType: string | undefined,
    fieldMetadataUniversalIdentifier: string,
  ) => Promise<{ id: string; path: string; size: number; createdAt: string; url: string }>;
};

export const createCoreStorageAdapter = (
  client: CoreApiClient,
  metadataClient: MetadataApiClient | MetadataUploadClientLike,
): PdfStorageAdapter => {
  const genql = asGenql(client);

  return {
    async uploadFile({ fileName, body, contentType }) {
      const uploaded = await metadataClient.uploadFile(
        Buffer.from(body),
        fileName,
        contentType,
        TWENTY_ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER,
      );
      return { url: uploaded.url, fileId: uploaded.id };
    },

    async attachFileToRecord({ objectName, recordId, fileId, fileName }) {
      const attachmentField = getAttachmentField(objectName);
      if (!fileId) throw new Error('attachFileToRecord requires a fileId from a prior uploadFile call.');
      const attachmentData: Record<string, unknown> = {
        name: fileName,
        file: [{ fileId, label: fileName }],
        ...(attachmentField ? { [attachmentField]: recordId } : {}),
      };

      const result = await genql.mutation({
        createAttachment: {
          __args: { data: attachmentData },
          id: true,
          name: true,
        },
      });
      const attached = result?.createAttachment as { id: string; name: string } | undefined;
      return { attachmentId: attached?.id };
    },
  };
};
