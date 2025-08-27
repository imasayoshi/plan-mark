import { useState, useEffect } from "react";
import { useAnnotations } from "../hooks/useAnnotations";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";
import { AnnotationWithLeader } from "./AnnotationWithLeader";
import { EditModal } from "./EditModal";
import { EditPreview } from "./EditPreview";
import { useAutoAdjust, autoAdjustService } from "../../annotation-auto-adjust";
import type {
  AnnotationType,
  AnnotationUpdateType,
  AnnotationCreateType,
} from "../types/annotation";

interface AnnotationLayerProps {
  documentId: string;
  pageNumber: number;
  selectedTool?: string | null;
  onStepChange?: (step: string, hasLeaderPoint: boolean) => void;
  onCollisionChange?: (hasCollisions: boolean, isManualMove?: boolean) => void;
  externalUpdateAnnotation?: (data: AnnotationUpdateType) => Promise<void>;
  externalAnnotations?: AnnotationType[];
  externalCreateAnnotation?: (
    data: AnnotationCreateType
  ) => Promise<AnnotationType | null>;
  externalDeleteAnnotation?: (id: string) => Promise<boolean>;
}

export function AnnotationLayer({
  documentId,
  pageNumber,
  selectedTool,
  onStepChange,
  onCollisionChange,
  externalUpdateAnnotation,
  externalAnnotations,
  externalCreateAnnotation,
  externalDeleteAnnotation,
}: AnnotationLayerProps) {
  const {
    annotations: localAnnotations,
    createAnnotation: localCreateAnnotation,
    updateAnnotation,
    updateAnnotationOptimistic,
    deleteAnnotation,
  } = useAnnotations(documentId, pageNumber);

  // 外部からの関数がある場合はそれを使用、なければローカルを使用
  const finalUpdateAnnotationOptimistic =
    externalUpdateAnnotation || updateAnnotationOptimistic;
  const annotations = externalAnnotations || localAnnotations;
  const createAnnotation = externalCreateAnnotation || localCreateAnnotation;
  const finalDeleteAnnotation = externalDeleteAnnotation || deleteAnnotation;

  const {
    calculateOptimalCommentPosition,
    calculateTextareaSize,
    applyAutoLineBreaks,
    getPDFBounds,
  } = useAnnotationUtils();
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

  // ツールが変更された時にコメント追加ボタンを非表示にする
  useEffect(() => {
    if (selectedTool !== null) {
      setPendingCommentButton(null);
    }
  }, [selectedTool]);

  // 編集モードに入った時にコメント追加ボタンと選択状態を非表示にする
  useEffect(() => {
    if (isEditing) {
      setPendingCommentButton(null);
      setSelectedAnnotationForActions(null);
    }
  }, [isEditing]);

  // ツールが変更された時に選択状態をリセット
  useEffect(() => {
    if (selectedTool !== null) {
      setSelectedAnnotationForActions(null);
    }
  }, [selectedTool]);

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
      setPendingCommentButton(null);
      setSelectedAnnotationForActions(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isEditing]);

  const handleLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // デフォルトモード（selectedTool === null）の場合のみ処理
    if (selectedTool === null) {
      event.preventDefault();
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // 選択状態をリセット
      setSelectedAnnotationForActions(null);

      // 既存のボタンがある場合、新しい位置にボタンを移動
      // または既存のボタンを消して新しい位置に表示
      setPendingCommentButton({ x: clickX, y: clickY });
      return;
    }
  };

  // 既存アノテーションと重ならない位置を見つける関数
  const findNonOverlappingPosition = (leaderX: number, leaderY: number) => {
    const defaultPosition = calculateOptimalCommentPosition(leaderX, leaderY);
    const commentWidth = 150;
    const commentHeight = 40;

    // デフォルト位置で重ならないかチェック
    const testAnnotation: AnnotationType = {
      id: "test",
      documentId,
      pageNumber,
      content: "",
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: commentWidth,
      height: commentHeight,
    };

    const hasOverlap = annotations.some((ann) => {
      if (ann.x === null || ann.y === null) return false;
      return checkCollisions([testAnnotation, ann]);
    });

    if (!hasOverlap) {
      return defaultPosition;
    }

    // 重なりがある場合、自動調整サービスを使用して最適位置を見つける
    const bounds = getPDFBounds();
    const containerBounds = {
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    };

    // 自動調整サービスのロジックを借用
    const edgeDistances = [
      { edge: "top", distance: leaderY },
      { edge: "right", distance: bounds.width - leaderX },
      { edge: "bottom", distance: bounds.height - leaderY },
      { edge: "left", distance: leaderX },
    ].sort((a, b) => a.distance - b.distance);

    // 各辺で重ならない位置を探索
    for (const { edge } of edgeDistances) {
      const positions = autoAdjustService.generateEdgePositions(
        testAnnotation,
        edge as "top" | "right" | "bottom" | "left",
        containerBounds,
        leaderX,
        leaderY
      );

      for (const position of positions) {
        const testAtPosition = {
          ...testAnnotation,
          x: position.x,
          y: position.y,
        };
        const hasOverlapAtPosition = annotations.some((ann) => {
          if (ann.x === null || ann.y === null) return false;
          return checkCollisions([testAtPosition, ann]);
        });

        if (!hasOverlapAtPosition) {
          return position;
        }
      }
    }

    // どこでも重なる場合はデフォルト位置を返す
    return defaultPosition;
  };

  // コメント追加ボタンクリック時の処理
  const handleAddCommentButtonClick = () => {
    if (!pendingCommentButton) return;

    const leaderX = pendingCommentButton.x;
    const leaderY = pendingCommentButton.y;

    // 既存アノテーションとの重なりを避ける位置を計算
    const optimalPosition = findNonOverlappingPosition(leaderX, leaderY);

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
    setPendingCommentButton(null); // ボタンを非表示にする
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
      await updateAnnotation({
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
      const success = await finalDeleteAnnotation(editingAnnotation.id);
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
    await finalUpdateAnnotationOptimistic({
      id: annotation.id,
      x: constrainedX,
      y: constrainedY,
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
          ? { ...ann, x: constrainedX, y: constrainedY }
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
  const handleEditFromActions = () => {
    if (selectedAnnotationForActions) {
      handleEditAnnotation(selectedAnnotationForActions);
      setSelectedAnnotationForActions(null);
    }
  };

  // アクションボタンからの削除
  const handleDeleteFromActions = async () => {
    if (selectedAnnotationForActions?.id) {
      try {
        const success = await finalDeleteAnnotation(
          selectedAnnotationForActions.id
        );
        if (success) {
          setSelectedAnnotationForActions(null);

          // 削除後に重なりチェックを実行
          if (onCollisionChange) {
            const updatedAnnotationsList = annotations.filter(
              (ann) => ann.id !== selectedAnnotationForActions.id
            );
            const hasCollisions = checkCollisions(updatedAnnotationsList);
            onCollisionChange(hasCollisions, false);
          }
        }
      } catch (error) {
        console.error("削除エラー:", error);
      }
    }
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
          pointerEvents: selectedTool === null ? "auto" : "none",
          zIndex: 10,
        }}
        onClick={handleLayerClick}
      />

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

      {/* 編集・削除アクションボタン */}
      {selectedAnnotationForActions && !isEditing && selectedTool === null && (
        <div
          style={{
            position: "absolute",
            left: Math.max(
              5,
              Math.min(
                selectedAnnotationForActions.x! - 15,
                getPDFBounds().width - 160
              )
            ),
            top: Math.max(
              5,
              Math.min(
                selectedAnnotationForActions.y! - 35,
                getPDFBounds().height - 30
              )
            ),
            zIndex: 20,
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            onClick={handleEditFromActions}
            style={{
              padding: "4px 8px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#059669";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#10b981";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✏️ 編集
          </button>
          <button
            onClick={handleDeleteFromActions}
            style={{
              padding: "4px 8px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🗑️ 削除
          </button>
        </div>
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
            onDelete={handleDeleteAnnotation}
          />
        </>
      )}
    </>
  );
}
