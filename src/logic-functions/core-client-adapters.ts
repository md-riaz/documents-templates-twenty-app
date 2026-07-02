import { CoreApiClient } from 'twenty-client-sdk/core';
import type { PdfStorageAdapter } from '../logic/generate-pdf';
import type { PermissionPrincipal } from '../permissions/permission-guards';

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
 * IMPORTANT (confirmed against docs.twenty.com/developers/extend/apps/logic/logic-functions):
 * `CoreApiClient.query`/`.mutation` are genql-style selection-set executors (NOT a raw
 * `{ query, variables }` GraphQL client) — an earlier version of this file incorrectly
 * bridged `client.query` into `../adapters/twenty-storage.adapter.ts`'s raw-GraphQL
 * `{ query({query, variables}) }` shape, which would fail at runtime. `MetadataApiClient`
 * is the client Twenty documents for file uploads (`uploadFile(buffer, filename, mimeType,
 * fieldUniversalIdentifier)`), but that method uploads into a FILES-type *field* on an
 * object — this app's `GeneratedDocument` object stores `pdfUrl` as plain TEXT and attaches
 * via Twenty's generic, polymorphic Attachment entity instead (matching the mutation shapes
 * already used in `../adapters/twenty-storage.adapter.ts`'s raw-GraphQL implementation), so
 * we use `CoreApiClient.upload` (the client's own file-upload member, generated per-workspace
 * and typed `any` in the SDK) for the upload step and `CoreApiClient.mutation` for creating
 * the Attachment record, re-expressing the same `uploadFile`/`createAttachment` argument
 * shapes as genql calls instead of raw GraphQL documents.
 *
 * `CoreApiClient.upload`'s exact generated signature cannot be confirmed from package types
 * alone (it depends on the workspace's introspected schema) — this should be verified
 * against a live Twenty instance before relying on it in production.
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

export const createCoreStorageAdapter = (client: CoreApiClient): PdfStorageAdapter => {
  const genql = asGenql(client);

  return {
    async uploadFile({ fileName, body, contentType }) {
      const base64 = Buffer.from(body).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      // Generic (non-field-scoped) upload mutation, matching the shape already used by
      // ../adapters/twenty-storage.adapter.ts, re-expressed as a genql selection. This is
      // distinct from CoreApiClient's own `uploadFile()` convenience method, which uploads
      // into a specific FILES-type *field* via `fieldMetadataUniversalIdentifier` — this app
      // has no such field on GeneratedDocument and instead attaches PDFs via Twenty's
      // generic, polymorphic Attachment entity (see attachFileToRecord below).
      const result = await genql.mutation({
        uploadFile: {
          __args: { file: { name: fileName, url: dataUrl, contentType } },
          id: true,
          url: true,
          name: true,
        },
      });
      const uploaded = result?.uploadFile as { id: string; url: string; name: string } | undefined;
      if (!uploaded) throw new Error('uploadFile mutation returned no result.');
      return { url: uploaded.url, fileId: uploaded.id };
    },

    async attachFileToRecord({ objectName, recordId, fileId, fileUrl, fileName }) {
      const attachmentField = getAttachmentField(objectName);
      const attachmentData: Record<string, unknown> = {
        name: fileName,
        file: [{ url: fileUrl, name: fileName, id: fileId }],
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
