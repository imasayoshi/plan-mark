import { generateClient } from "aws-amplify/data";
import { uploadData, remove, getUrl } from "aws-amplify/storage";
import type { Schema } from "../../../../amplify/data/resource";
import type { DocumentType, DocumentUploadType } from "../types/document";

const client = generateClient<Schema>();

export const documentService = {
  async uploadDocument(upload: DocumentUploadType): Promise<DocumentType> {
    const fileKey = `documents/${Date.now()}-${upload.file.name}`;

    await uploadData({
      path: fileKey,
      data: upload.file,
    }).result;

    const result = await client.models.Document.create({
      name: upload.name,
      fileKey: fileKey,
    });

    if (!result.data) {
      throw new Error("Failed to create document record");
    }

    return result.data;
  },

  async getDocuments(): Promise<DocumentType[]> {
    const result = await client.models.Document.list();
    return result.data || [];
  },

  async getDocument(id: string): Promise<DocumentType | null> {
    const result = await client.models.Document.get({ id });
    return result.data || null;
  },

  async getDocumentUrl(fileKey: string): Promise<string> {
    const result = await getUrl({
      path: fileKey,
      options: {
        validateObjectExistence: true,
        expiresIn: 3600, // 1時間有効
      },
    });

    return result.url.toString();
  },

  async deleteDocument(id: string, fileKey: string): Promise<void> {
    await Promise.all([
      client.models.Document.delete({ id }),
      remove({ path: fileKey }),
    ]);
  },
};
