import { AppPath, useSelectedRecordIds } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';

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
 * `filterDocumentHistory`/`DocumentHistoryRecord` are pure data helpers (not a
 * React component), so importing them here from the `generate-document`
 * front-component module is safe. Do NOT import a React component from
 * another `*.front-component.tsx` file — Twenty bundles each front component
 * as an independent entry point, and cross-entry component imports fail at
 * build time. Generation itself is reached via the "Generate Document"
 * command-menu item (works on any record, any object), not embedded inline
 * here — this component's job is purely to show history.
 */
import {
  filterDocumentHistory,
  type DocumentHistoryRecord,
} from './generate-document.front-component';

export type DocumentShellComponentProps = {
  /**
   * Object type of the record whose documents are shown. The execution context
   * only exposes record ids, so the host page layout supplies this.
   */
  primaryObjectType?: string;
  /** Document history for this record (injected by the real workstream). */
  records?: DocumentHistoryRecord[];
};

export const DocumentShellComponent = ({
  primaryObjectType = '',
  records = [],
}: DocumentShellComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const primaryRecordId = selectedRecordIds.length > 0 ? selectedRecordIds[0] : '';

  const history = primaryRecordId
    ? filterDocumentHistory({ primaryObjectType, primaryRecordId, records })
    : [];

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
