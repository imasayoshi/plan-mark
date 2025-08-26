import { useState } from 'react';
import { documentService } from '../services/documentService';
import type { DocumentUploadType, DocumentType } from '../types/document';

export const useDocumentUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (upload: DocumentUploadType): Promise<DocumentType | null> => {
    setIsUploading(true);
    setError(null);
    
    try {
      const document = await documentService.uploadDocument(upload);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadDocument,
    isUploading,
    error,
    clearError: () => setError(null),
  };
};
