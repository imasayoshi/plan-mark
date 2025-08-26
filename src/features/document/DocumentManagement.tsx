import { useState, useEffect } from 'react';
import { DocumentUploader } from './components/DocumentUploader';
import { DocumentViewer } from './components/DocumentViewer';
import { documentService } from './services/documentService';
import type { DocumentType } from './types/document';

interface DocumentManagementProps {
  onDocumentSelect: (document: DocumentType | null) => void;
}

export function DocumentManagement({ onDocumentSelect }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await documentService.getDocuments();
      const sortedDocs = docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDocuments(sortedDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (document: DocumentType) => {
    setDocuments(prev => {
      const newDocs = [...prev, document];
      return newDocs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    setSelectedDocument(document);
    onDocumentSelect(document);
  };

  const handleDocumentSelect = (document: DocumentType) => {
    setSelectedDocument(document);
    onDocumentSelect(document);
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* アップロードエリア */}
      <div style={{ 
        padding: '24px', 
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0
      }}>
        <DocumentUploader onUploadSuccess={handleUploadSuccess} />
      </div>
      
      {/* 図面一覧エリア */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div style={{ 
          padding: '24px 24px 16px 24px',
          flexShrink: 0
        }}>
          <h2 style={{ 
            margin: '0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#334155' 
          }}>
            📁 図面一覧
          </h2>
        </div>
        
        <div style={{ 
          flex: 1,
          padding: '0 24px 24px 24px',
          overflow: 'auto',
          minHeight: 0
        }}>
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '32px',
              color: '#64748b'
            }}>
              <div>⏳ 読み込み中...</div>
            </div>
          ) : documents.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '32px',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <p style={{ margin: 0, fontSize: '16px' }}>図面がありません</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '12px',
                    border: selectedDocument?.id === doc.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedDocument?.id === doc.id ? '#eff6ff' : 'white',
                    transition: 'all 0.2s',
                    boxShadow: selectedDocument?.id === doc.id ? '0 1px 3px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    flexShrink: 0
                  }}
                  onClick={() => handleDocumentSelect(doc)}
                  onMouseEnter={(e) => {
                    if (selectedDocument?.id !== doc.id) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDocument?.id !== doc.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{ 
                    fontWeight: '500', 
                    color: '#1e293b',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📄</span>
                    {doc.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b' 
                  }}>
                    {new Date(doc.createdAt || '').toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 図面ビューアー（サイドバー内では表示しない） */}
      <div style={{ display: 'none' }}>
        {selectedDocument && (
          <DocumentViewer
            document={selectedDocument}
          />
        )}
      </div>
    </div>
  );
}
