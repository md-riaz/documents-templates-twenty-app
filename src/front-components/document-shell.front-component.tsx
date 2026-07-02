import { useEffect, useRef, useState } from 'react';

import { AppPath, useSelectedRecordIds } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

// `getAppPath` (the SDK's own path builder) is declared but not part of
// `twenty-sdk/front-component`'s public export surface — only the `AppPath`
// enum is exported. Build the URL ourselves from its confirmed template
// string (`AppPath.RecordShowPage === '/object/:objectNameSingular/:objectRecordId'`).
const recordShowPath = (objectNameSingular: string, objectRecordId: string): string =>
  AppPath.RecordShowPage
    .replace(':objectNameSingular', encodeURIComponent(objectNameSingular))
    .replace(':objectRecordId', encodeURIComponent(objectRecordId));

import { DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

/**
 * `DocumentHistoryRecord` is a pure type (not a React component), so
 * importing it here from the `generate-document` front-component module is
 * safe. Do NOT import a React component from another `*.front-component.tsx`
 * file — Twenty bundles each front component as an independent entry point,
 * and cross-entry component imports fail at build time.
 */
import type { DocumentHistoryRecord } from './generate-document.front-component';

/** Minimal genql-style surface this file needs from the generated CoreApiClient. */
type GenqlClientLike = {
  query: (request: Record<string, unknown>) => Promise<Record<string, unknown> | null | undefined>;
};

/**
 * Fetches Document history for a record by `primaryRecordId` alone — record
 * ids are unique per-record across the whole workspace, so this doesn't need
 * `primaryObjectType` as a filter criterion (which the host has no way to
 * supply to a front component anyway; Twenty has no prop-injection mechanism
 * for widgets, confirmed against its docs — only `frontComponentUniversalIdentifier`
 * is configurable). Uses the same host-authenticated `CoreApiClient` pattern
 * as the Template Editor front component.
 */
export const fetchDocumentHistory = async (
  client: GenqlClientLike,
  primaryRecordId: string,
): Promise<DocumentHistoryRecord[]> => {
  const result = await client.query({
    documents: {
      __args: { filter: { primaryRecordId: { eq: primaryRecordId } } },
      edges: {
        node: {
          id: true,
          primaryObjectType: true,
          primaryRecordId: true,
          status: true,
          generatedAt: true,
          generatedBy: true,
          pdfUrl: true,
          template: { name: true },
        },
      },
    },
  });
  const edges = (result?.documents as { edges?: Array<{ node?: Record<string, unknown> | null } | null> } | undefined)?.edges ?? [];
  const records = edges
    .map((edge) => edge?.node)
    .filter((node): node is Record<string, unknown> => Boolean(node))
    .map((node) => ({
      id: node.id as string,
      primaryObjectType: node.primaryObjectType as string | null,
      primaryRecordId: node.primaryRecordId as string | null,
      templateName: (node.template as { name?: string } | null)?.name ?? null,
      status: node.status as string | null,
      generatedAt: node.generatedAt as string | null,
      generatedBy: node.generatedBy as string | null,
      pdfUrl: node.pdfUrl as string | null,
    }));
  return records.sort((left, right) => String(right.generatedAt ?? '').localeCompare(String(left.generatedAt ?? '')));
};

export type DocumentShellComponentProps = {
  /** Test/override hook — when supplied, skips the live `CoreApiClient` fetch. Live widget never receives this. */
  records?: DocumentHistoryRecord[];
};

export const DocumentShellComponent = ({
  records,
}: DocumentShellComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const primaryRecordId = selectedRecordIds.length > 0 ? selectedRecordIds[0] : '';

  const clientRef = useRef<GenqlClientLike | null>(null);
  const client = (clientRef.current ??= new CoreApiClient() as unknown as GenqlClientLike);

  const [fetchedHistory, setFetchedHistory] = useState<DocumentHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(primaryRecordId && !records));

  useEffect(() => {
    if (!primaryRecordId || records) return;
    let cancelled = false;
    setIsLoading(true);
    void fetchDocumentHistory(client, primaryRecordId).then((history) => {
      if (!cancelled) {
        setFetchedHistory(history);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryRecordId]);

  const history = records ?? fetchedHistory;

  if (isLoading) {
    return (
      <section aria-label="Document history" aria-busy="true">
        <p>Loading documents…</p>
      </section>
    );
  }

  return (
    <section aria-label="Document history">
      <header>
        <h2>Documents</h2>
        <p>Select this record and choose "Generate Document" from the command menu to create a new one.</p>
      </header>

      <table>
        <thead>
          <tr>
            <th>Template</th>
            <th>Status</th>
            <th>Generated</th>
            <th>Document</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id} data-document-id={record.id}>
              <td>{record.templateName ?? 'Document'}</td>
              <td>{record.status ?? 'RENDERED'}</td>
              <td>{record.generatedAt ?? ''}</td>
              <td>
                {/*
                  Durable path: the Document record's own Files tab always has
                  a live Attachment (Twenty re-signs its URL per query). This
                  is the primary way to reach the PDF, since `pdfUrl` below is
                  a signed link that expires (~24h).
                */}
                <a href={recordShowPath('document', record.id)}>
                  View Document
                </a>
              </td>
              <td>
                {record.pdfUrl ? (
                  <a href={record.pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {history.length === 0 ? (
        <p>No documents for this record yet.</p>
      ) : null}
    </section>
  );
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineFrontComponent({
  universalIdentifier: DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'document-shell',
  description: 'Record shell showing document history for this record. Use the "Generate Document" command menu item to create a new one.',
  component: DocumentShellComponent,
});
