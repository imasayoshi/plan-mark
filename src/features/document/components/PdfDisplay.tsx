import { Document, Page, pdfjs } from "react-pdf";
import { DrawingLayer } from "../../drawing/components/DrawingLayer";
import { AnnotationLayer } from "../../annotation/components/AnnotationLayer";
import type { PdfDisplayPropsType } from "../types/document";
import type { ShapeType } from "../../drawing/types/shape";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfDisplay({
  document,
  pdfUrl,
  pageNumber,
  isPdfFullyLoaded,
  selectedTool,
  polygonCompleteRef,
  polygonCancelRef,
  annotations,
  updateAnnotationOptimistic,
  createAnnotation,
  deleteAnnotation,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageLoadSuccess,
  onPolygonStateChange,
  onCollisionChange,
}: PdfDisplayPropsType) {
  return (
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
            key={`pdf-${document.id}-${document.fileKey}`}
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
              key={`page-${document.id}-${pageNumber}`}
              pageNumber={pageNumber}
              scale={0.8}
              onLoadSuccess={onPageLoadSuccess}
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

          {/* 図形描画レイヤー - PDF完全読み込み後のみ表示 */}
          {isPdfFullyLoaded && (
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
                key={`drawing-${document.id}-${pageNumber}`}
                documentId={document.id}
                pageNumber={pageNumber}
                selectedTool={selectedTool as ShapeType}
                onPolygonStateChange={onPolygonStateChange}
                polygonCompleteRef={polygonCompleteRef}
                polygonCancelRef={polygonCancelRef}
              />
            </div>
          )}

          {/* アノテーションレイヤー - PDF完全読み込み後のみ表示 */}
          {isPdfFullyLoaded && (
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
                key={`annotation-${document.id}-${pageNumber}`}
                documentId={document.id}
                pageNumber={pageNumber}
                selectedTool={selectedTool}
                annotations={annotations}
                updateAnnotationOptimistic={updateAnnotationOptimistic}
                createAnnotation={createAnnotation}
                deleteAnnotation={deleteAnnotation}
                onCollisionChange={onCollisionChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
