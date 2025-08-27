import type { AnnotationType } from "../../annotation/types/annotation";

export interface PositionType {
  x: number;
  y: number;
}

export interface BoundsType {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlapInfoType {
  annotation1: AnnotationType;
  annotation2: AnnotationType;
  overlapArea: number;
}

export interface AdjustmentResultType {
  annotation: AnnotationType;
  newPosition: PositionType;
  moved: boolean;
}

export interface AutoAdjustConfigType {
  minDistance: number;
  maxIterations: number;
  stepSize: number;
  marginFromBounds: number;
  preferredDirections: Array<"top" | "right" | "bottom" | "left">;
}

export interface CollisionDetectionResultType {
  hasCollision: boolean;
  overlaps: OverlapInfoType[];
  totalOverlapArea: number;
}
