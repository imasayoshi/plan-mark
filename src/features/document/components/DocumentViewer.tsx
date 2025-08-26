import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { documentService } from "../services/documentService";
import { DrawingLayer } from "../../drawing/components/DrawingLayer";
import { AnnotationLayer } from "../../annotation/components/AnnotationLayer";
import type { DocumentType } from "../types/document";
import type { ShapeType } from "../../drawing/types/shape";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type ToolType = "annotation" | ShapeType;

interface DocumentViewerProps {
  document: DocumentType;
  selectedTool?: string | null;
  onToolChange?: (tool: ToolType | null) => void;
}

export function DocumentViewer({
  document,
  selectedTool: externalSelectedTool,
  onToolChange,
}: DocumentViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const polygonCompleteRef = useRef<(() => Promise<boolean>) | null>(null);
  const polygonCancelRef = useRef<(() => void) | null>(null);

  // 外部からのselectedToolを同期
  useEffect(() => {
    setSelectedTool(externalSelectedTool as ToolType);
  }, [externalSelectedTool]);

  useEffect(() => {
    loadDocument();
  }, [document.fileKey]);

  const loadDocument = async () => {
    if (!document.fileKey) {
      setError("ファイルキーが見つかりません");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = await documentService.getDocumentUrl(document.fileKey);
      setPdfUrl(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load document";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError(`PDF読み込みエラー: ${error.message}`);
  };

  const handleToolChange = (tool: ToolType | null) => {
    // 同じモードをクリックした場合は解除（トグル機能）
    if (selectedTool === tool) {
      // 多角形モードの場合は描画中の点もキャンセル
      if (tool === "polygon" && polygonPoints.length > 0) {
        if (polygonCancelRef.current) {
          polygonCancelRef.current();
        }
      }
      setSelectedTool(null);
      if (onToolChange) {
        onToolChange(null);
      }
      return;
    }

    // 多角形モードから他のモードに切り替える場合、多角形描画をキャンセル
    if (
      selectedTool === "polygon" &&
      tool !== "polygon" &&
      polygonPoints.length > 0
    ) {
      if (polygonCancelRef.current) {
        polygonCancelRef.current();
      }
    }

    setSelectedTool(tool);
    if (onToolChange) {
      onToolChange(tool);
    }
  };

  const handlePolygonStateChange = (
    points: Array<{ x: number; y: number }>
  ) => {
    setPolygonPoints(points);
  };

  const handlePolygonComplete = async () => {
    if (polygonCompleteRef.current) {
      const success = await polygonCompleteRef.current();
      if (!success) {
        alert("多角形を作成するには最低3つの点が必要です");
      }
    }
  };

  const handlePolygonCancel = () => {
    if (polygonCancelRef.current) {
      polygonCancelRef.current();
    }
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "32px" }}
      >
        <div>⏳ 読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "4px",
          color: "#d32f2f",
        }}
      >
        エラー: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {pdfUrl && (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
          }}
        >
          {/* PDF表示エリア */}
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f9fafb",
              overflow: "auto",
              padding: "16px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "inline-block",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", overflow: "hidden" }}>
                <Document
                  key={document.fileKey}
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div
                      style={{
                        padding: "48px",
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      ⏳ PDFを読み込み中...
                    </div>
                  }
                  error={
                    <div
                      style={{
                        padding: "32px",
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        borderRadius: "4px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      ❌ PDFの読み込みに失敗しました
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={0.8}
                    renderAnnotationLayer={false} //内蔵機能を無効化
                    renderTextLayer={false} //内蔵機能を無効化
                    loading={
                      <div
                        style={{
                          padding: "32px",
                          color: "#6b7280",
                        }}
                      >
                        📄 ページを読み込み中...
                      </div>
                    }
                  />
                </Document>

                {/* 図形描画レイヤー */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <DrawingLayer
                    documentId={document.id}
                    pageNumber={pageNumber}
                    selectedTool={
                      selectedTool === "annotation"
                        ? null
                        : (selectedTool as ShapeType)
                    }
                    selectedMode={selectedTool}
                    onPolygonStateChange={handlePolygonStateChange}
                    polygonCompleteRef={polygonCompleteRef}
                    polygonCancelRef={polygonCancelRef}
                  />
                </div>

                {/* アノテーションレイヤー */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <AnnotationLayer
                    documentId={document.id}
                    pageNumber={pageNumber}
                    selectedTool={selectedTool}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ページナビゲーション & ツールバー */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "white",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexShrink: 0,
              zIndex: 10,
              position: "relative",
            }}
          >
            {/* 左側スペーサー */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                minWidth: "200px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {!selectedTool && (
                  <>
                    <span>選択・移動モード</span>
                  </>
                )}
                {selectedTool === "annotation" && (
                  <>
                    コメント追加モード
                    <span style={{ color: "#ff9800", marginLeft: "8px" }}>
                      引き出し線の先端をクリックしてコメントを追加
                    </span>
                  </>
                )}
                {selectedTool === "rectangle" && "四角形描画モード"}
                {selectedTool === "circle" && "円描画モード"}
                {selectedTool === "arrow" && "矢印描画モード"}
                {selectedTool === "polygon" && (
                  <>
                    多角形描画モード
                    {polygonPoints.length > 0 && (
                      <span
                        style={{
                          color: "#3b82f6",
                          fontWeight: "500",
                          marginLeft: "8px",
                        }}
                      >
                        ({polygonPoints.length}点)
                      </span>
                    )}
                  </>
                )}
                {selectedTool &&
                  !(selectedTool === "polygon" && polygonPoints.length > 0) && (
                    <button
                      onClick={() => handleToolChange(null)}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        cursor: "pointer",
                        color: "#6b7280",
                        marginLeft: "8px",
                      }}
                      title="選択モードに戻る"
                    >
                      解除
                    </button>
                  )}

                {/* 多角形描画中の操作ボタン */}
                {selectedTool === "polygon" && polygonPoints.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      marginLeft: "12px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={handlePolygonComplete}
                      disabled={polygonPoints.length < 3}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor:
                          polygonPoints.length >= 3 ? "#16a34a" : "#d1d5db",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          polygonPoints.length >= 3 ? "pointer" : "not-allowed",
                        fontWeight: "500",
                      }}
                      title={
                        polygonPoints.length >= 3
                          ? "多角形を確定"
                          : "最低3点必要"
                      }
                    >
                      確定
                    </button>
                    <button
                      onClick={handlePolygonCancel}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                      title="多角形描画をキャンセル"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 中央のツールバー（モード選択ボタン） */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {[
                { value: "annotation", label: "コメント", icon: "💬" },
                { value: "rectangle", label: "四角形", icon: "▬" },
                { value: "circle", label: "円", icon: "●" },
                { value: "arrow", label: "矢印", icon: "→" },
                { value: "polygon", label: "多角形", icon: "⬟" },
              ].map((tool) => (
                <button
                  key={tool.value}
                  onClick={() => handleToolChange(tool.value as ToolType)}
                  title={tool.label}
                  style={{
                    padding: "8px",
                    border:
                      selectedTool === tool.value
                        ? "2px solid #3b82f6"
                        : "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor:
                      selectedTool === tool.value ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontSize: "16px",
                    minWidth: "40px",
                    minHeight: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            {/* 右側のページナビゲーション */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                minWidth: "200px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber((page) => Math.max(page - 1, 1));
                }}
                disabled={pageNumber <= 1}
                style={{
                  padding: "8px 16px",
                  backgroundColor: pageNumber <= 1 ? "#f3f4f6" : "#3b82f6",
                  color: pageNumber <= 1 ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: pageNumber <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← 前
              </button>
              <span style={{ fontWeight: "500", color: "#374151" }}>
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageNumber((page) => Math.min(page + 1, numPages));
                }}
                disabled={pageNumber >= numPages}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    pageNumber >= numPages ? "#f3f4f6" : "#3b82f6",
                  color: pageNumber >= numPages ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: pageNumber >= numPages ? "not-allowed" : "pointer",
                }}
              >
                次 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
