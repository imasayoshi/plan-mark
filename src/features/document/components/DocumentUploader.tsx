import { useState, useRef } from 'react';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import type { DocumentType } from '../types/document';

interface DocumentUploaderProps {
  onUploadSuccess: (document: DocumentType) => void;
}

export function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, isUploading, error, clearError } = useDocumentUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      if (!name) {
        setName(file.name.replace('.pdf', ''));
      }
      clearError();
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) return;

    const document = await uploadDocument({
      name: name.trim(),
      file: selectedFile,
    });

    if (document) {
      onUploadSuccess(document);
      setName('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    clearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: '600',
        color: '#334155',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📤 図面アップロード
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          placeholder="図面名を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isUploading}
          style={{
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px',
            backgroundColor: isUploading ? '#f9fafb' : 'white',
            color: '#374151'
          }}
        />
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          border: '2px dashed #d1d5db',
          borderRadius: '6px',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          color: '#6b7280',
          fontSize: '16px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (!isUploading) {
            e.currentTarget.style.borderColor = '#9ca3af';
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (!isUploading) {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        >
          PDFファイルを選択
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
        
        {selectedFile && (
          <div style={{ 
            padding: '8px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '6px',
            fontSize: '16px',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              flex: 1,
              minWidth: 0
            }}>
              <span>✓</span>
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedFile.name}
              </span>
            </span>
            <button
              onClick={handleRemoveFile}
              style={{
                background: 'none',
                border: 'none',
                color: '#047857',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                lineHeight: 1,
                flexShrink: 0,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.1)';
                e.currentTarget.style.color = '#065f46';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#047857';
              }}
              title="ファイルを削除"
            >
              ×
            </button>
          </div>
        )}
        
        {error && (
          <div style={{
            padding: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#dc2626',
            fontSize: '16px',
            position: 'relative'
          }}>
            {error}
            <button 
              onClick={clearError}
              style={{ 
                position: 'absolute',
                top: '4px',
                right: '8px',
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                color: '#dc2626',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !name.trim() || isUploading}
          style={{
            padding: '12px',
            backgroundColor: !selectedFile || !name.trim() || isUploading ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !selectedFile || !name.trim() || isUploading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!(!selectedFile || !name.trim() || isUploading)) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!(!selectedFile || !name.trim() || isUploading)) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {isUploading ? 'アップロード中...' : 'アップロード'}
        </button>
      </div>
    </div>
  );
}
