import { useEffect } from "react";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";
import { useAnnotationPositioning } from "../hooks/useAnnotationPositioning";
import type {
  AnnotationType,
  AnnotationCreatorPropsType,
} from "../types/annotation";

export function AnnotationCreator({
  documentId,
  pageNumber,
  selectedTool,
  isEditing,
  annotations,
  pendingCommentButton,
  onCreateAnnotation,
  onSetPendingButton,
  onSetSelectedAnnotation,
}: AnnotationCreatorPropsType) {
  const { getPDFBounds } = useAnnotationUtils();
  const { findNonOverlappingPosition } = useAnnotationPositioning();

  // ツールが変更された時にコメント追加ボタンを非表示にする
  useEffect(() => {
    if (selectedTool !== null) {
      onSetPendingButton(null);
    }
  }, [selectedTool, onSetPendingButton]);

  // 編集モードに入った時にコメント追加ボタンを非表示にする
  useEffect(() => {
    if (isEditing) {
      onSetPendingButton(null);
    }
  }, [isEditing, onSetPendingButton]);

  // ドキュメント全体のクリック監視でボタンを非表示にする
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // 編集中の場合は何もしない
      if (isEditing) return;

      const target = event.target as Element;

      // ボタン自体がクリックされた場合は何もしない
      if (target.closest("button")) return;

      // アノテーション要素がクリックされた場合は何もしない
      if (target.closest("textarea")) return;

      // それ以外の場合はボタンを非表示
      onSetPendingButton(null);
      onSetSelectedAnnotation(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isEditing, onSetPendingButton, onSetSelectedAnnotation]);

  const handleLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // デフォルトモード（selectedTool === null）の場合のみ処理
    if (selectedTool === null) {
      event.preventDefault();
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // 選択状態をリセット
      onSetSelectedAnnotation(null);

      // 既存のボタンがある場合、新しい位置にボタンを移動
      // または既存のボタンを消して新しい位置に表示
      onSetPendingButton({ x: clickX, y: clickY });
      return;
    }
  };

  const handleAddCommentButtonClick = () => {
    if (!pendingCommentButton) return;

    const leaderX = pendingCommentButton.x;
    const leaderY = pendingCommentButton.y;

    // 既存アノテーションとの重なりを避ける位置を計算
    const optimalPosition = findNonOverlappingPosition(
      leaderX,
      leaderY,
      annotations,
      documentId,
      pageNumber
    );

    const newAnnotation: AnnotationType = {
      id: "",
      documentId,
      pageNumber,
      content: "",
      x: optimalPosition.x,
      y: optimalPosition.y,
      leaderX: leaderX,
      leaderY: leaderY,
      width: 150,
      height: 40,
    };

    onCreateAnnotation(newAnnotation);
    onSetPendingButton(null); // ボタンを非表示にする
  };

  return (
    <>
      {/* クリック検知レイヤー */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: selectedTool === null ? "auto" : "none",
          zIndex: 10,
        }}
        onClick={handleLayerClick}
      />

      {/* コメント追加ボタン */}
      {pendingCommentButton && !isEditing && (
        <div
          style={{
            position: "absolute",
            left: Math.max(
              5,
              Math.min(pendingCommentButton.x - 35, getPDFBounds().width - 75)
            ),
            top: Math.max(
              5,
              Math.min(pendingCommentButton.y - 20, getPDFBounds().height - 30)
            ),
            zIndex: 20,
          }}
        >
          <button
            onClick={handleAddCommentButtonClick}
            style={{
              padding: "6px 12px",
              backgroundColor: "#1f2937",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#374151";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1f2937";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            💬 コメント追加
          </button>
        </div>
      )}
    </>
  );
}
