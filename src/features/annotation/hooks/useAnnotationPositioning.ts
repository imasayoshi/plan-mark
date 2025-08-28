import { useCallback } from "react";
import { useAnnotationUtils } from "./useAnnotationUtils";
import { useAutoAdjust, autoAdjustService } from "../../annotation-auto-adjust";
import type { AnnotationType } from "../types/annotation";

export function useAnnotationPositioning() {
  const { calculateOptimalCommentPosition, getPDFBounds } =
    useAnnotationUtils();
  const { checkCollisions } = useAutoAdjust();

  const findNonOverlappingPosition = useCallback(
    (
      leaderX: number,
      leaderY: number,
      annotations: AnnotationType[],
      documentId: string,
      pageNumber: number
    ) => {
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
    },
    [calculateOptimalCommentPosition, getPDFBounds, checkCollisions]
  );

  const constrainAnnotationPosition = useCallback(
    (
      annotation: AnnotationType,
      deltaX: number,
      deltaY: number
    ): { x: number; y: number } => {
      const currentX = annotation.x || 0;
      const currentY = annotation.y || 0;
      const newX = currentX + deltaX;
      const newY = currentY + deltaY;

      const bounds = getPDFBounds();
      const boxWidth = annotation.width || 20;
      const boxHeight = annotation.height || 20;

      const constrainedX = Math.max(0, Math.min(newX, bounds.width - boxWidth));
      const constrainedY = Math.max(
        0,
        Math.min(newY, bounds.height - boxHeight)
      );

      return { x: constrainedX, y: constrainedY };
    },
    [getPDFBounds]
  );

  return {
    findNonOverlappingPosition,
    constrainAnnotationPosition,
  };
}
