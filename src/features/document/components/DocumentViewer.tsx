import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { documentService } from "../services/documentService";
import { DrawingLayer } from "../../drawing/components/DrawingLayer";
import { AnnotationLayer } from "../../annotation/components/AnnotationLayer";
import { AutoAdjustButton, useAutoAdjust } from "../../annotation-auto-adjust";
import { useAnnotations } from "../../annotation/hooks/useAnnotations";
import { useAnnotationUtils } from "../../annotation/hooks/useAnnotationUtils";
import type { DocumentType } from "../types/document";
import type { ShapeType } from "../../drawing/types/shape";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type ToolType = "annotation" | ShapeType;

interface DocumentViewerProps {
  document: DocumentType;
  selectedTool?: string | null;
  onToolChange?: (tool: ToolType | null, hatched?: boolean) => void;
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
  const [isPdfDocumentLoaded, setIsPdfDocumentLoaded] = useState(false);
  const [isPdfPageLoaded, setIsPdfPageLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [selectedToolHatched, setSelectedToolHatched] =
    useState<boolean>(false);
  const [toolStates, setToolStates] = useState<
    Record<string, "normal" | "hatched" | null>
  >({
    rectangle: null,
    circle: null,
    polygon: null,
  });
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const polygonCompleteRef = useRef<(() => Promise<boolean>) | null>(null);
  const polygonCancelRef = useRef<(() => void) | null>(null);

  // 自動調整機能関連
  // PDF読み込み完了フラグ（ドキュメントとページの両方が読み込まれた状態）
  const isPdfFullyLoaded = isPdfDocumentLoaded && isPdfPageLoaded;

  const {
    annotations,
    updateAnnotationOptimistic,
    createAnnotation,
    deleteAnnotation,
  } = useAnnotations(document.id, pageNumber, isPdfFullyLoaded);

  // デバッグ用ログ（重複ログを避けるため、依存配列を使ったuseEffectに変更）
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

  // 外部からのselectedToolを同期
  useEffect(() => {
    setSelectedTool(externalSelectedTool as ToolType);
  }, [externalSelectedTool]);

  // ドキュメント変更時にPDF読み込み状態を完全にリセット
  useEffect(() => {
    setIsPdfDocumentLoaded(false);
    setIsPdfPageLoaded(false);
    setPdfUrl(null); // PDFのURLもクリアして前のPDFが表示されないようにする
    setIsLoading(true); // ローディング状態に戻す
    setError(null); // エラー状態もクリア
  }, [document.id]);

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
    setIsPdfDocumentLoaded(true);
    setIsPdfPageLoaded(false); // ページ読み込みはまだ
  };

  const onPageLoadSuccess = () => {
    setIsPdfPageLoaded(true);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError(`PDF読み込みエラー: ${error.message}`);
    setIsPdfDocumentLoaded(false);
    setIsPdfPageLoaded(false);
  };

  const handleToolChange = (tool: ToolType | null) => {
    // 解除ボタン（デフォルトモードに戻る）
    if (tool === null) {
      setSelectedTool(null);
      setSelectedToolHatched(false);
      // モード切替ボタンの状態も初期状態にリセット
      setToolStates({
        rectangle: null,
        circle: null,
        polygon: null,
      });
      // 多角形描画中の場合はキャンセル
      if (selectedTool === "polygon" && polygonPoints.length > 0) {
        if (polygonCancelRef.current) {
          polygonCancelRef.current();
        }
      }
      if (onToolChange) {
        onToolChange(null);
      }
      return;
    }

    // 矢印の場合（斜線なし）
    if (tool === "arrow") {
      if (selectedTool === "arrow") {
        setSelectedTool(null);
        setSelectedToolHatched(false);
        if (onToolChange) {
          onToolChange(null);
        }
      } else {
        setSelectedTool("arrow");
        setSelectedToolHatched(false);
        if (onToolChange) {
          onToolChange("arrow");
        }
      }
      return;
    }

    // 斜線対応図形（rectangle, circle, polygon）の3段階切り替え
    if (tool && ["rectangle", "circle", "polygon"].includes(tool)) {
      const originalTool = tool; // 元のツール名を保持
      const currentState = toolStates[tool];
      let newState: "normal" | "hatched" | null;
      let hatched = false;
      let newSelectedTool: ToolType | null = tool;

      if (currentState === null) {
        newState = "normal";
        hatched = false;
      } else if (currentState === "normal") {
        newState = "hatched";
        hatched = true;
      } else {
        newState = null;
        newSelectedTool = null;
      }

      // 多角形描画中の場合のキャンセル処理
      if (
        selectedTool === "polygon" &&
        polygonPoints.length > 0 &&
        (newSelectedTool !== "polygon" || newState === null)
      ) {
        if (polygonCancelRef.current) {
          polygonCancelRef.current();
        }
      }

      setToolStates((prev) => ({ ...prev, [originalTool]: newState }));
      setSelectedTool(newSelectedTool);
      setSelectedToolHatched(hatched);
      if (onToolChange) {
        onToolChange(newSelectedTool, hatched);
      }
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
      } else {
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
                      selectedToolHatched={selectedToolHatched}
                      onPolygonStateChange={handlePolygonStateChange}
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
                      onCollisionChange={handleCollisionChange}
                      externalUpdateAnnotation={updateAnnotationOptimistic}
                      externalAnnotations={annotations}
                      externalCreateAnnotation={createAnnotation}
                      externalDeleteAnnotation={deleteAnnotation}
                    />
                  </div>
                )}
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
                    <span>デフォルトモード</span>
                  </>
                )}

                {selectedTool === "rectangle" &&
                  `四角形描画モード${selectedToolHatched ? "（斜線付き）" : ""}`}
                {selectedTool === "circle" &&
                  `円描画モード${selectedToolHatched ? "（斜線付き）" : ""}`}
                {selectedTool === "arrow" && "矢印描画モード"}
                {selectedTool === "polygon" && (
                  <>
                    多角形描画モード{selectedToolHatched ? "（斜線付き）" : ""}
                    {polygonPoints.length > 0 && (
                      <span
                        style={{
                          color: "#3b82f6",
                          fontWeight: "500",
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
                {
                  value: "rectangle",
                  label: "四角形",
                  icon: "▬",
                  hatchIcon: "⫽",
                },
                { value: "circle", label: "円", icon: "●", hatchIcon: "⊙" },
                { value: "arrow", label: "矢印", icon: "→" },
                {
                  value: "polygon",
                  label: "多角形",
                  icon: "⬟",
                  hatchIcon: "⬢",
                },
              ].map((tool) => {
                const isSelected = selectedTool === tool.value;
                const toolState = tool.hatchIcon
                  ? toolStates[tool.value]
                  : null;
                const isHatched = toolState === "hatched";

                // 境界線と背景色の決定
                let borderColor = "#d1d5db";
                let backgroundColor = "white";
                let buttonTitle = tool.label;

                if (isSelected) {
                  if (isHatched) {
                    borderColor = "#ef4444";
                    backgroundColor = "#fef2f2";
                    buttonTitle = `${tool.label}（斜線付き）`;
                  } else {
                    borderColor = "#3b82f6";
                    backgroundColor = "#eff6ff";
                  }
                }

                return (
                  <button
                    key={tool.value}
                    onClick={() => handleToolChange(tool.value as ToolType)}
                    title={buttonTitle}
                    style={{
                      padding: "8px",
                      border: `2px solid ${borderColor}`,
                      borderRadius: "6px",
                      backgroundColor,
                      cursor: "pointer",
                      fontSize: "16px",
                      minWidth: "40px",
                      minHeight: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* 斜線背景パターン */}
                    {isHatched && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundImage: `repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 2px,
                            ${borderColor} 2px,
                            ${borderColor} 4px
                          )`,
                          opacity: 0.3,
                          zIndex: 1,
                        }}
                      />
                    )}
                    {/* アイコン（常に通常アイコン） */}
                    <span style={{ position: "relative", zIndex: 2 }}>
                      {tool.icon}
                    </span>
                  </button>
                );
              })}

              {/* 自動調整ボタン */}
              <div style={{ marginLeft: "16px" }}>
                <AutoAdjustButton
                  onClick={handleAutoAdjust}
                  isAdjusting={isAdjusting}
                  hasCollisions={hasCollisions}
                />
              </div>
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
                  setIsPdfPageLoaded(false); // ページ変更時にリセット
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
                  setIsPdfPageLoaded(false); // ページ変更時にリセット
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
