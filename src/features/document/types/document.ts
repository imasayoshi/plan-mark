export interface DocumentType {
  id: string;
  name: string | null;
  fileKey: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentUploadType {
  name: string;
  file: File;
}
