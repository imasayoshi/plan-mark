import { useState, useCallback } from "react";
import { autoAdjustService } from "../services/autoAdjustService";
import type { AnnotationType } from "../../annotation/types/annotation";
import type {
  BoundsType,
  AdjustmentResultType,
  UseAutoAdjustReturnType,
} from "../types/auto-adjust";

export function useAutoAdjust(): UseAutoAdjustReturnType {
  const [isAdjusting, setIsAdjusting] = useState(false);

  const adjustAnnotations = useCallback(
    async (
      annotations: AnnotationType[],
      containerBounds: BoundsType
    ): Promise<AdjustmentResultType[]> => {
      setIsAdjusting(true);

      try {
        const results = autoAdjustService.adjustAnnotationsLayout(
          annotations,
          containerBounds
        );
        return results;
      } finally {
        setIsAdjusting(false);
      }
    },
    []
  );

  const checkCollisions = useCallback(
    (annotations: AnnotationType[]): boolean => {
      if (annotations.length < 2) return false;
      const collisionResult = autoAdjustService.detectCollisions(annotations);
      return collisionResult.hasCollision;
    },
    []
  );

  return {
    isAdjusting,
    adjustAnnotations,
    checkCollisions,
  };
}
