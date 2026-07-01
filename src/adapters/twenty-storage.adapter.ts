import type { PdfStorageAdapter } from '../logic/generate-pdf';

type TwentyApiClient = {
  query: (input: { query: string; variables?: Record<string, unknown> }) => Promise<{ data: Record<string, unknown> }>;
};

const UPLOAD_FILE_MUTATION = `
  mutation UploadFile($file: FileItemInput!) {
    uploadFile(file: $file) {
      id
      url
      name
    }
  }
`;

const CREATE_ATTACHMENT_MUTATION = `
  mutation CreateAttachment($data: AttachmentCreateInput!) {
    createAttachment(data: $data) {
      id
      name
    }
  }
`;

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

const getAttachmentField = (objectName: string): string | undefined => {
  return RECORD_TYPE_FIELD_MAP[objectName.toLowerCase()];
};

export const createTwentyStorageAdapter = (client: TwentyApiClient): PdfStorageAdapter => ({
  async uploadFile({ key, fileName, body, contentType, metadata }) {
    const base64 = Buffer.from(body).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    const result = await client.query({
      query: UPLOAD_FILE_MUTATION,
      variables: {
        file: {
          name: fileName,
          url: dataUrl,
          contentType,
        },
      },
    });

    const uploaded = result.data.uploadFile as { id: string; url: string; name: string };
    return { url: uploaded.url, fileId: uploaded.id };
  },

  async attachFileToRecord({ objectName, recordId, fileId, fileUrl, fileName, contentType, metadata }) {
    const attachmentField = getAttachmentField(objectName);

    const attachmentData: Record<string, unknown> = {
      name: fileName,
      file: [{ url: fileUrl, name: fileName, id: fileId }],
    };

    if (attachmentField) {
      attachmentData[attachmentField] = recordId;
    }

    const result = await client.query({
      query: CREATE_ATTACHMENT_MUTATION,
      variables: { data: attachmentData },
    });

    const attached = result.data.createAttachment as { id: string; name: string };
    return { attachmentId: attached.id };
  },
});
