import { useState, useEffect } from "react";
import { useAnnotations } from "../hooks/useAnnotations";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";
import { AnnotationWithLeader } from "./AnnotationWithLeader";
import { EditModal } from "./EditModal";
import { EditPreview } from "./EditPreview";
import type { AnnotationType } from "../types/annotation";

interface AnnotationLayerProps {
  documentId: string;
  pageNumber: number;
  selectedTool?: string | null;
  onStepChange?: (step: string, hasLeaderPoint: boolean) => void;
}

export function AnnotationLayer({
  documentId,
  pageNumber,
  selectedTool,
  onStepChange,
}: AnnotationLayerProps) {
  const {
    annotations,
    createAnnotation,
    updateAnnotation,
    updateAnnotationOptimistic,
  } = useAnnotations(documentId, pageNumber);
  const {
    calculateOptimalCommentPosition,
    calculateTextareaSize,
    applyAutoLineBreaks,
    getPDFBounds,
  } = useAnnotationUtils();

  const [editingAnnotation, setEditingAnnotation] =
    useState<AnnotationType | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [draggingAnnotations, setDraggingAnnotations] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // ステップ変更通知（ワンステップ化に合わせて簡略化）
  useEffect(() => {
    if (onStepChange) {
      onStepChange(
        selectedTool === "annotation" ? "selecting-leader" : "none",
        false
      );
    }
  }, [selectedTool, onStepChange]);

  const handleLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool !== "annotation") return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const leaderX = event.clientX - rect.left;
    const leaderY = event.clientY - rect.top;

    const optimalPosition = calculateOptimalCommentPosition(leaderX, leaderY);

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

    if (editingAnnotation.id) {
      await updateAnnotation({
        id: editingAnnotation.id,
        content: editingContent,
        x: adjustedX,
        y: adjustedY,
        width,
        height,
      });
    } else {
      await createAnnotation({
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
    }

    setEditingAnnotation(null);
    setEditingContent("");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingAnnotation(null);
    setEditingContent("");
    setIsEditing(false);
  };

  const handleAnnotationMove = (
    annotation: AnnotationType,
    deltaX: number,
    deltaY: number
  ) => {
    const currentX = annotation.x || 0;
    const currentY = annotation.y || 0;
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;

    const bounds = getPDFBounds();
    const boxWidth = annotation.width || 20;
    const boxHeight = annotation.height || 20;

    const constrainedX = Math.max(0, Math.min(newX, bounds.width - boxWidth));
    const constrainedY = Math.max(0, Math.min(newY, bounds.height - boxHeight));

    setDraggingAnnotations((prev) =>
      new Map(prev).set(annotation.id, { x: constrainedX, y: constrainedY })
    );
  };

  const handleAnnotationMoveEnd = async (
    annotation: AnnotationType,
    deltaX: number,
    deltaY: number
  ) => {
    const currentX = annotation.x || 0;
    const currentY = annotation.y || 0;
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;

    const bounds = getPDFBounds();
    const boxWidth = annotation.width || 20;
    const boxHeight = annotation.height || 20;

    const constrainedX = Math.max(0, Math.min(newX, bounds.width - boxWidth));
    const constrainedY = Math.max(0, Math.min(newY, bounds.height - boxHeight));

    // draggingStateを削除する前に楽観的更新を実行
    await updateAnnotationOptimistic({
      id: annotation.id,
      x: constrainedX,
      y: constrainedY,
    });

    // その後draggingStateを削除
    setDraggingAnnotations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(annotation.id);
      return newMap;
    });
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

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: selectedTool === "annotation" ? "auto" : "none",
          zIndex: 10,
        }}
        onClick={handleLayerClick}
      />

      {annotations.map(
        (annotation) =>
          annotation.x !== null &&
          annotation.y !== null && (
            <AnnotationWithLeader
              key={annotation.id}
              annotation={
                draggingAnnotations.has(annotation.id)
                  ? {
                      ...annotation,
                      ...draggingAnnotations.get(annotation.id)!,
                    }
                  : annotation
              }
              selectedTool={selectedTool}
              onMove={handleAnnotationMove}
              onMoveEnd={handleAnnotationMoveEnd}
            />
          )
      )}

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
          />
        </>
      )}
    </>
  );
}
