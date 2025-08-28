import { useState, useEffect } from "react";
import { usePdfViewer } from "../hooks/usePdfViewer";
import { useToolManager } from "../hooks/useToolManager";
import { PdfDisplay } from "./PdfDisplay";
import { DocumentToolbar } from "./DocumentToolbar";
import { useAutoAdjust } from "../../annotation-auto-adjust";
import { useAnnotations } from "../../annotation/hooks/useAnnotations";
import { useAnnotationUtils } from "../../annotation/hooks/useAnnotationUtils";
import type { DocumentViewerPropsType } from "../types/document";

export function DocumentViewer({
  document,
  selectedTool: externalSelectedTool,
  onToolChange,
}: DocumentViewerPropsType) {
  // PDF表示フック
  const {
    pdfUrl,
    isLoading,
    error,
    numPages,
    pageNumber,
    isPdfFullyLoaded,
    onDocumentLoadSuccess,
    onPageLoadSuccess,
    onDocumentLoadError,
    handlePageChange,
  } = usePdfViewer(document);

  // ツール管理フック
  const {
    selectedTool,
    polygonPoints,
    polygonCompleteRef,
    polygonCancelRef,
    handleToolChange,
    handlePolygonStateChange,
    handlePolygonComplete,
    handlePolygonCancel,
  } = useToolManager(externalSelectedTool, onToolChange, document.id);

  // アノテーション・自動調整機能
  const {
    annotations,
    updateAnnotationOptimistic,
    createAnnotation,
    deleteAnnotation,
  } = useAnnotations(document.id, pageNumber, isPdfFullyLoaded);

  const { getPDFBounds } = useAnnotationUtils();
  const { isAdjusting, adjustAnnotations, checkCollisions } = useAutoAdjust();
  const [hasCollisions, setHasCollisions] = useState(false);

  // AnnotationLayerからの重なり状態変更を受け取る
  const handleCollisionChange = (
    hasCollisions: boolean,
    isManualMove = false
  ) => {
    setHasCollisions(hasCollisions);

    // 手動移動の場合は重なり検知のみ（自動調整しない）
    if (isManualMove) {
      return;
    }

    // 自動調整やプログラム的な変更の場合のみ、必要に応じて処理
    // （現在は重なり状態の更新のみ）
  };

  // 初期読み込み時の重なり検知
  useEffect(() => {
    if (annotations.length > 1) {
      setHasCollisions(checkCollisions(annotations));
    } else {
      setHasCollisions(false);
    }
  }, [annotations, checkCollisions]);

  // 自動調整処理を実行
  const handleAutoAdjust = async () => {
    if (annotations.length === 0) return;

    const pdfBounds = getPDFBounds();
    const containerBounds = {
      x: 0,
      y: 0,
      width: pdfBounds.width,
      height: pdfBounds.height,
    };

    try {
      const results = await adjustAnnotations(annotations, containerBounds);

      // 移動されたアノテーションのみ更新
      const movedAnnotations = results.filter((result) => result.moved);

      if (movedAnnotations.length > 0) {
        // 並列実行で更新処理を高速化
        await Promise.all(
          movedAnnotations.map((result) =>
            updateAnnotationOptimistic({
              id: result.annotation.id,
              x: result.newPosition.x,
              y: result.newPosition.y,
            })
          )
        );

        // 自動配置後に重なりチェックを再実行
        setTimeout(() => {
          const updatedAnnotations = annotations.map((ann) => {
            const result = results.find((r) => r.annotation.id === ann.id);
            return result?.moved
              ? { ...ann, x: result.newPosition.x, y: result.newPosition.y }
              : ann;
          });
          const hasCollisions = checkCollisions(updatedAnnotations);
          setHasCollisions(hasCollisions);
        }, 100);
      }
    } catch (error) {
      console.error("自動調整エラー:", error);
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
          <PdfDisplay
            document={document}
            pdfUrl={pdfUrl}
            pageNumber={pageNumber}
            isPdfFullyLoaded={isPdfFullyLoaded}
            selectedTool={selectedTool}
            polygonCompleteRef={polygonCompleteRef}
            polygonCancelRef={polygonCancelRef}
            annotations={annotations}
            updateAnnotationOptimistic={updateAnnotationOptimistic}
            createAnnotation={createAnnotation}
            deleteAnnotation={deleteAnnotation}
            onDocumentLoadSuccess={onDocumentLoadSuccess}
            onDocumentLoadError={onDocumentLoadError}
            onPageLoadSuccess={onPageLoadSuccess}
            onPolygonStateChange={handlePolygonStateChange}
            onCollisionChange={handleCollisionChange}
          />

          {/* 統合ツールバー */}
          <DocumentToolbar
            selectedTool={selectedTool}
            polygonPoints={polygonPoints}
            isAdjusting={isAdjusting}
            hasCollisions={hasCollisions}
            pageNumber={pageNumber}
            numPages={numPages}
            onToolChange={handleToolChange}
            onPolygonComplete={handlePolygonComplete}
            onPolygonCancel={handlePolygonCancel}
            onAutoAdjust={handleAutoAdjust}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
