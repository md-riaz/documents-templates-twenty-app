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
    const result = await client.query({
      query: CREATE_ATTACHMENT_MUTATION,
      variables: {
        data: {
          name: fileName,
          file: [{ url: fileUrl, name: fileName, id: fileId }],
          ...(objectName === 'company' ? { targetCompanyId: recordId } : {}),
          ...(objectName === 'person' ? { targetPersonId: recordId } : {}),
          ...(objectName === 'opportunity' ? { targetOpportunityId: recordId } : {}),
          ...(objectName === 'generatedDocument' ? { targetGeneratedDocumentId: recordId } : {}),
        },
      },
    });

    const attached = result.data.createAttachment as { id: string; name: string };
    return { attachmentId: attached.id };
  },
});
