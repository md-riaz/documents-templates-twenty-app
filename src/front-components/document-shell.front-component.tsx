import { useSelectedRecordIds } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';

import { DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';

/**
 * `filterGeneratedDocumentHistory`/`GeneratedDocumentHistoryRecord` are pure
 * data helpers (not a React component), so importing them here from the
 * `generate-document` front-component module is safe. Do NOT import a React
 * component from another `*.front-component.tsx` file — Twenty bundles each
 * front component as an independent entry point, and cross-entry component
 * imports fail at build time. Generation itself is reached via the
 * "Generate Document" command-menu item (works on any record, any object),
 * not embedded inline here — this component's job is purely to show history.
 */
import {
  filterGeneratedDocumentHistory,
  type GeneratedDocumentHistoryRecord,
} from './generate-document.front-component';

export type DocumentShellComponentProps = {
  /**
   * Object type of the record whose documents are shown. The execution context
   * only exposes record ids, so the host page layout supplies this.
   */
  primaryObjectType?: string;
  /** Generated-document history for this record (injected by the real workstream). */
  records?: GeneratedDocumentHistoryRecord[];
};

export const DocumentShellComponent = ({
  primaryObjectType = '',
  records = [],
}: DocumentShellComponentProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const primaryRecordId = selectedRecordIds.length > 0 ? selectedRecordIds[0] : '';

  const history = primaryRecordId
    ? filterGeneratedDocumentHistory({ primaryObjectType, primaryRecordId, records })
    : [];

  return (
    <section aria-label="Generated document history">
      <header>
        <h2>Generated Documents</h2>
        <p>Select this record and choose "Generate Document" from the command menu to create a new one.</p>
      </header>

      <table>
        <thead>
          <tr>
            <th>Template</th>
            <th>Status</th>
            <th>Generated</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id} data-generated-document-id={record.id}>
              <td>{record.templateName ?? 'Generated document'}</td>
              <td>{record.status ?? 'RENDERED'}</td>
              <td>{record.generatedAt ?? ''}</td>
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
        <p>No generated documents for this record yet.</p>
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
  description: 'Record shell showing generated-document history and an inline document generator.',
  component: DocumentShellComponent,
});
