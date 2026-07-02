import { CoreApiClient } from 'twenty-client-sdk/core';
import { createTwentyStorageAdapter } from '../adapters/twenty-storage.adapter';
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
 * The existing Twenty storage adapter expects a raw-GraphQL client shaped as
 * `{ query({ query, variables }) => Promise<{ data }> }`. The generated CoreApiClient
 * exposes a genql executor on `client.query`, so we forward the request through and
 * normalize the `{ data }` envelope. See the report note on SDK uncertainty: the exact
 * request shape accepted by the generated client is only known once it is generated on
 * a live Twenty instance; this forwards the adapter's request object unchanged.
 */
export type RawGraphqlClient = {
  query: (input: { query: string; variables?: Record<string, unknown> }) => Promise<{ data: Record<string, unknown> }>;
};

export const coreClientToGraphqlClient = (client: CoreApiClient): RawGraphqlClient => ({
  async query(request) {
    const execute = client.query as unknown as (input: unknown) => Promise<unknown>;
    const result = await execute(request);
    return (result ?? { data: {} }) as { data: Record<string, unknown> };
  },
});

export const createCoreStorageAdapter = (client: CoreApiClient): PdfStorageAdapter =>
  createTwentyStorageAdapter(coreClientToGraphqlClient(client));
