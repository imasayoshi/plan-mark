import { useState } from 'react';
import { DocumentManagement } from './features/document/DocumentManagement';

import { DocumentViewer } from './features/document/components/DocumentViewer';
import type { DocumentType } from './features/document/types/document';

function App() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleDocumentSelect = (document: DocumentType | null) => {
    setSelectedDocument(document);
  };



  const handleToolChange = (tool: string | null) => {
    setSelectedTool(tool);
    console.log('Tool changed to:', tool || 'selection mode');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* ヘッダー */}
      <header style={{ 
        backgroundColor: '#1e293b', 
        color: 'white', 
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
        height: '32px',
        minHeight: '32px',
        maxHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ☰
        </button>
        <h1 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#f1f5f9'
        }}>
          📐 Plan Mark
        </h1>
      </header>

      {/* メインコンテンツ */}
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 32px)',
        overflow: 'hidden'
      }}>
        {/* サイドバー */}
        <aside style={{ 
          width: isSidebarOpen ? '320px' : '0px',
          minWidth: isSidebarOpen ? '320px' : '0px',
          maxWidth: isSidebarOpen ? '320px' : '0px',
          backgroundColor: 'white',
          borderRight: isSidebarOpen ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isSidebarOpen ? '1px 0 3px rgba(0, 0, 0, 0.05)' : 'none',
          height: '100%',
          overflow: 'hidden',
          transition: 'width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease'
        }}>
          {isSidebarOpen && (
            <DocumentManagement 
              onDocumentSelect={handleDocumentSelect}
            />
          )}
        </aside>

        {/* 図面表示エリア */}
        <main style={{ 
          flex: 1, 
          position: 'relative',
          backgroundColor: 'white',
          overflow: 'hidden',
          height: '100%'
        }}>
          {selectedDocument ? (
            <div style={{ 
              width: '100%',
              height: '100%', 
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 図面ビューアー */}
              <div style={{ 
                width: '100%',
                height: '100%',
                padding: '16px',
                overflow: 'auto',
                boxSizing: 'border-box'
              }}>
                <DocumentViewer
                  document={selectedDocument}
                  selectedTool={selectedTool}
                  onToolChange={handleToolChange}
                />
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              flexDirection: 'column',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
              <h2 style={{ margin: '0 0 8px 0', color: '#334155' }}>図面を選択してください</h2>
              <p style={{ margin: 0, fontSize: '16px' }}>図面一覧から選択可能です</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
