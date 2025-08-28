import { useState, useEffect } from "react";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";
import { useAnnotationPositioning } from "../hooks/useAnnotationPositioning";
import { AnnotationWithLeader } from "./AnnotationWithLeader";
import { AnnotationCreator } from "./AnnotationCreator";
import { AnnotationActions } from "./AnnotationActions";
import { EditModal } from "./EditModal";
import { EditPreview } from "./EditPreview";
import { useAutoAdjust } from "../../annotation-auto-adjust";
import type {
  AnnotationType,
  AnnotationLayerPropsType,
} from "../types/annotation";

export function AnnotationLayer({
  documentId,
  pageNumber,
  selectedTool,
  annotations,
  updateAnnotationOptimistic,
  createAnnotation,
  deleteAnnotation,
  onStepChange,
  onCollisionChange,
}: AnnotationLayerPropsType) {
  const { calculateTextareaSize, applyAutoLineBreaks, getPDFBounds } =
    useAnnotationUtils();
  const { constrainAnnotationPosition } = useAnnotationPositioning();
  const { checkCollisions } = useAutoAdjust();

  const [editingAnnotation, setEditingAnnotation] =
    useState<AnnotationType | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [draggingAnnotations, setDraggingAnnotations] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [pendingCommentButton, setPendingCommentButton] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedAnnotationForActions, setSelectedAnnotationForActions] =
    useState<AnnotationType | null>(null);

  // ステップ変更通知（ワンステップ化に合わせて簡略化）
  useEffect(() => {
    if (onStepChange) {
      onStepChange("none", false);
    }
  }, [selectedTool, onStepChange]);

  // ツールが変更された時に選択状態をリセット
  useEffect(() => {
    if (selectedTool !== null) {
      setSelectedAnnotationForActions(null);
    }
  }, [selectedTool]);

  // コメント作成処理
  const handleCreateAnnotation = (newAnnotation: AnnotationType) => {
    setEditingAnnotation(newAnnotation);
    setEditingContent("");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingAnnotation) return;

    const { width, height } = calculateTextareaSize(editingContent);
    const bounds = getPDFBounds();
    const margin = 10;

    const currentX = editingAnnotation.x || 0;
    const currentY = editingAnnotation.y || 0;

    const adjustedX = Math.max(
      margin,
      Math.min(currentX, bounds.width - width - margin)
    );
    const adjustedY = Math.max(
      margin,
      Math.min(currentY, bounds.height - height - margin)
    );

    let updatedAnnotationsList = annotations;

    if (editingAnnotation.id) {
      // 既存アノテーションの更新
      await updateAnnotationOptimistic({
        id: editingAnnotation.id,
        content: editingContent,
        x: adjustedX,
        y: adjustedY,
        width,
        height,
      });
      // 更新されたアノテーションリストを手動作成
      updatedAnnotationsList = annotations.map((ann) =>
        ann.id === editingAnnotation.id
          ? {
              ...ann,
              content: editingContent,
              x: adjustedX,
              y: adjustedY,
              width,
              height,
            }
          : ann
      );
    } else {
      // 新規アノテーション作成
      const newAnnotation = await createAnnotation({
        documentId,
        pageNumber,
        content: editingContent,
        x: adjustedX,
        y: adjustedY,
        leaderX: editingAnnotation.leaderX || editingAnnotation.x || 0,
        leaderY: editingAnnotation.leaderY || editingAnnotation.y || 0,
        width,
        height,
      });

      // 新しいアノテーションを含むリストを手動作成
      if (newAnnotation) {
        updatedAnnotationsList = [...annotations, newAnnotation];
      }
    }

    setEditingAnnotation(null);
    setEditingContent("");
    setIsEditing(false);

    // 保存後に重なりチェックを実行（更新されたリストを使用）
    if (onCollisionChange) {
      const hasCollisions = checkCollisions(updatedAnnotationsList);
      onCollisionChange(hasCollisions, false); // 新規作成は自動調整可能
    }
  };

  const handleCancel = () => {
    setEditingAnnotation(null);
    setEditingContent("");
    setIsEditing(false);
  };

  // 既存アノテーションの編集開始
  const handleEditAnnotation = (annotation: AnnotationType) => {
    setEditingAnnotation(annotation);
    setEditingContent(annotation.content || "");
    setIsEditing(true);
  };

  // アノテーション削除
  const handleDeleteAnnotation = async () => {
    if (!editingAnnotation?.id) return;

    try {
      const success = await deleteAnnotation(editingAnnotation.id);
      if (success) {
        setEditingAnnotation(null);
        setEditingContent("");
        setIsEditing(false);

        // 削除後に重なりチェックを実行
        if (onCollisionChange) {
          // 削除されたアノテーションを除いたリストで重なりチェック
          const updatedAnnotationsList = annotations.filter(
            (ann) => ann.id !== editingAnnotation.id
          );
          const hasCollisions = checkCollisions(updatedAnnotationsList);
          onCollisionChange(hasCollisions, false);
        }
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  const handleAnnotationMove = (
    annotation: AnnotationType,
    deltaX: number,
    deltaY: number
  ) => {
    const constrainedPosition = constrainAnnotationPosition(
      annotation,
      deltaX,
      deltaY
    );
    setDraggingAnnotations((prev) =>
      new Map(prev).set(annotation.id, constrainedPosition)
    );
  };

  const handleAnnotationMoveEnd = async (
    annotation: AnnotationType,
    deltaX: number,
    deltaY: number
  ) => {
    const constrainedPosition = constrainAnnotationPosition(
      annotation,
      deltaX,
      deltaY
    );

    // draggingStateを削除する前に楽観的更新を実行
    await updateAnnotationOptimistic({
      id: annotation.id,
      x: constrainedPosition.x,
      y: constrainedPosition.y,
    });

    // 少し遅延してからdraggingStateを削除（アニメーション完了を待つ）
    setTimeout(() => {
      setDraggingAnnotations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(annotation.id);
        return newMap;
      });
    }, 50); // 50ms遅延

    // 移動後に重なりチェックを実行し、結果をDocumentViewerに通知
    // 手動移動の場合は重なり検知のみ（自動調整はしない）
    if (onCollisionChange) {
      // 更新されたアノテーションリストで重なりチェック
      const updatedAnnotations = annotations.map((ann) =>
        ann.id === annotation.id
          ? { ...ann, x: constrainedPosition.x, y: constrainedPosition.y }
          : ann
      );
      const hasCollisions = checkCollisions(updatedAnnotations);
      onCollisionChange(hasCollisions, true); // 手動移動フラグをtrue
    }
  };

  const handleContentChange = (value: string) => {
    if (isComposing) {
      setEditingContent(value);
    } else {
      const processedValue = applyAutoLineBreaks(value);
      setEditingContent(processedValue);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    setIsComposing(false);
    const processedValue = applyAutoLineBreaks(e.currentTarget.value);
    setEditingContent(processedValue);
  };

  // デフォルトモード時のアノテーションクリック処理
  const handleAnnotationClickForActions = (annotation: AnnotationType) => {
    if (selectedTool === null) {
      // 既に選択されているアノテーションをクリックした場合は選択解除
      if (selectedAnnotationForActions?.id === annotation.id) {
        setSelectedAnnotationForActions(null);
      } else {
        setSelectedAnnotationForActions(annotation);
        setPendingCommentButton(null); // コメント追加ボタンを非表示
      }
    }
  };

  // アクションボタンからの編集開始
  const handleEditFromActions = (annotation: AnnotationType) => {
    handleEditAnnotation(annotation);
    setSelectedAnnotationForActions(null);
  };

  // アクションボタンからの削除
  const handleDeleteFromActions = async (annotation: AnnotationType) => {
    if (!annotation.id) return;

    try {
      const success = await deleteAnnotation(annotation.id);
      if (success) {
        setSelectedAnnotationForActions(null);

        // 削除後に重なりチェックを実行
        if (onCollisionChange) {
          const updatedAnnotationsList = annotations.filter(
            (ann) => ann.id !== annotation.id
          );
          const hasCollisions = checkCollisions(updatedAnnotationsList);
          onCollisionChange(hasCollisions, false);
        }
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  return (
    <>
      {/* コメント作成コンポーネント */}
      <AnnotationCreator
        documentId={documentId}
        pageNumber={pageNumber}
        selectedTool={selectedTool}
        isEditing={isEditing}
        annotations={annotations}
        pendingCommentButton={pendingCommentButton}
        onCreateAnnotation={handleCreateAnnotation}
        onSetPendingButton={setPendingCommentButton}
        onSetSelectedAnnotation={setSelectedAnnotationForActions}
      />

      {/* 既存アノテーションの表示 */}
      {annotations.map((annotation) => {
        const isDragging = draggingAnnotations.has(annotation.id);
        const finalAnnotation = isDragging
          ? {
              ...annotation,
              ...draggingAnnotations.get(annotation.id)!,
            }
          : annotation;

        return (
          annotation.x !== null &&
          annotation.y !== null && (
            <AnnotationWithLeader
              key={annotation.id}
              annotation={finalAnnotation}
              selectedTool={selectedTool}
              onMove={handleAnnotationMove}
              onMoveEnd={handleAnnotationMoveEnd}
              onEdit={handleEditAnnotation}
              onClickForActions={handleAnnotationClickForActions}
            />
          )
        );
      })}

      {/* アクションボタンコンポーネント */}
      <AnnotationActions
        selectedAnnotation={selectedAnnotationForActions}
        selectedTool={selectedTool}
        isEditing={isEditing}
        onEdit={handleEditFromActions}
        onDelete={handleDeleteFromActions}
      />

      {/* 編集モーダル */}
      {isEditing && editingAnnotation && (
        <>
          <EditPreview
            annotation={editingAnnotation}
            content={editingContent}
            onContentChange={handleContentChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          <EditModal
            annotation={editingAnnotation}
            content={editingContent}
            onContentChange={handleContentChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDeleteAnnotation}
          />
        </>
      )}
    </>
  );
}
