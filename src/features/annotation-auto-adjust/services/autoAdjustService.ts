import type { AnnotationType } from "../../annotation/types/annotation";
import type {
  PositionType,
  BoundsType,
  OverlapInfoType,
  AdjustmentResultType,
  AutoAdjustConfigType,
  CollisionDetectionResultType,
} from "../types/auto-adjust";

export class AutoAdjustService {
  private config: AutoAdjustConfigType = {
    minDistance: 10,
    maxIterations: 50,
    stepSize: 5,
    marginFromBounds: 15,
    preferredDirections: ["right", "bottom", "top", "left"],
  };

  calculateAnnotationBounds(annotation: AnnotationType): BoundsType {
    return {
      x: annotation.x || 0,
      y: annotation.y || 0,
      width: annotation.width || 150,
      height: annotation.height || 40,
    };
  }

  checkOverlap(bounds1: BoundsType, bounds2: BoundsType): number {
    const xOverlap = Math.max(
      0,
      Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width) -
        Math.max(bounds1.x, bounds2.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height) -
        Math.max(bounds1.y, bounds2.y)
    );

    return xOverlap * yOverlap;
  }

  detectCollisions(
    annotations: AnnotationType[]
  ): CollisionDetectionResultType {
    const overlaps: OverlapInfoType[] = [];
    let totalOverlapArea = 0;

    for (let i = 0; i < annotations.length; i++) {
      for (let j = i + 1; j < annotations.length; j++) {
        const bounds1 = this.calculateAnnotationBounds(annotations[i]);
        const bounds2 = this.calculateAnnotationBounds(annotations[j]);
        const overlapArea = this.checkOverlap(bounds1, bounds2);

        if (overlapArea > 0) {
          overlaps.push({
            annotation1: annotations[i],
            annotation2: annotations[j],
            overlapArea,
          });
          totalOverlapArea += overlapArea;
        }
      }
    }

    return {
      hasCollision: overlaps.length > 0,
      overlaps,
      totalOverlapArea,
    };
  }

  findNearestValidPosition(
    annotation: AnnotationType,
    otherAnnotations: AnnotationType[],
    containerBounds: BoundsType
  ): PositionType {
    const currentBounds = this.calculateAnnotationBounds(annotation);
    const leaderX = annotation.leaderX || currentBounds.x;
    const leaderY = annotation.leaderY || currentBounds.y;

    // 各辺との距離を計算
    const edgeDistances = [
      { edge: "top", distance: leaderY },
      { edge: "right", distance: containerBounds.width - leaderX },
      { edge: "bottom", distance: containerBounds.height - leaderY },
      { edge: "left", distance: leaderX },
    ].sort((a, b) => a.distance - b.distance);

    // 近い辺から順に配置を試行
    for (const { edge } of edgeDistances) {
      const positions = this.generateEdgePositions(
        annotation,
        edge as "top" | "right" | "bottom" | "left",
        containerBounds,
        leaderX,
        leaderY
      );

      for (const position of positions) {
        if (
          this.isValidPosition(
            position,
            annotation,
            otherAnnotations,
            containerBounds
          )
        ) {
          return position;
        }
      }
    }

    // どの辺でも配置できない場合は元の位置を返す
    return { x: currentBounds.x, y: currentBounds.y };
  }

  generateEdgePositions(
    annotation: AnnotationType,
    edge: "top" | "right" | "bottom" | "left",
    containerBounds: BoundsType,
    leaderX: number,
    leaderY: number
  ): PositionType[] {
    const bounds = this.calculateAnnotationBounds(annotation);
    const margin = this.config.marginFromBounds;
    const positions: PositionType[] = [];

    switch (edge) {
      case "top":
        // 上辺に配置
        const topY = margin;
        // 引き出し線に最も近い位置を最初に試行
        const idealTopX = Math.max(
          margin,
          Math.min(
            leaderX - bounds.width / 2,
            containerBounds.width - bounds.width - margin
          )
        );
        positions.push({ x: idealTopX, y: topY });

        // 上辺の他の位置も生成（左右に展開）
        for (
          let offset = this.config.stepSize;
          offset <= 100;
          offset += this.config.stepSize
        ) {
          const leftX = idealTopX - offset;
          const rightX = idealTopX + offset;

          if (leftX >= margin) {
            positions.push({ x: leftX, y: topY });
          }
          if (rightX <= containerBounds.width - bounds.width - margin) {
            positions.push({ x: rightX, y: topY });
          }
        }
        break;

      case "right":
        // 右辺に配置
        const rightX = containerBounds.width - bounds.width - margin;
        const idealRightY = Math.max(
          margin,
          Math.min(
            leaderY - bounds.height / 2,
            containerBounds.height - bounds.height - margin
          )
        );
        positions.push({ x: rightX, y: idealRightY });

        // 右辺の他の位置も生成（上下に展開）
        for (
          let offset = this.config.stepSize;
          offset <= 100;
          offset += this.config.stepSize
        ) {
          const topY = idealRightY - offset;
          const bottomY = idealRightY + offset;

          if (topY >= margin) {
            positions.push({ x: rightX, y: topY });
          }
          if (bottomY <= containerBounds.height - bounds.height - margin) {
            positions.push({ x: rightX, y: bottomY });
          }
        }
        break;

      case "bottom":
        // 下辺に配置
        const bottomY = containerBounds.height - bounds.height - margin;
        const idealBottomX = Math.max(
          margin,
          Math.min(
            leaderX - bounds.width / 2,
            containerBounds.width - bounds.width - margin
          )
        );
        positions.push({ x: idealBottomX, y: bottomY });

        // 下辺の他の位置も生成（左右に展開）
        for (
          let offset = this.config.stepSize;
          offset <= 100;
          offset += this.config.stepSize
        ) {
          const leftX = idealBottomX - offset;
          const rightX = idealBottomX + offset;

          if (leftX >= margin) {
            positions.push({ x: leftX, y: bottomY });
          }
          if (rightX <= containerBounds.width - bounds.width - margin) {
            positions.push({ x: rightX, y: bottomY });
          }
        }
        break;

      case "left":
        // 左辺に配置
        const leftX = margin;
        const idealLeftY = Math.max(
          margin,
          Math.min(
            leaderY - bounds.height / 2,
            containerBounds.height - bounds.height - margin
          )
        );
        positions.push({ x: leftX, y: idealLeftY });

        // 左辺の他の位置も生成（上下に展開）
        for (
          let offset = this.config.stepSize;
          offset <= 100;
          offset += this.config.stepSize
        ) {
          const topY = idealLeftY - offset;
          const bottomY = idealLeftY + offset;

          if (topY >= margin) {
            positions.push({ x: leftX, y: topY });
          }
          if (bottomY <= containerBounds.height - bounds.height - margin) {
            positions.push({ x: leftX, y: bottomY });
          }
        }
        break;
    }

    return positions;
  }

  isValidPosition(
    position: PositionType,
    annotation: AnnotationType,
    otherAnnotations: AnnotationType[],
    containerBounds: BoundsType
  ): boolean {
    const bounds = this.calculateAnnotationBounds(annotation);
    const testBounds: BoundsType = {
      x: position.x,
      y: position.y,
      width: bounds.width,
      height: bounds.height,
    };

    if (
      testBounds.x < this.config.marginFromBounds ||
      testBounds.y < this.config.marginFromBounds ||
      testBounds.x + testBounds.width >
        containerBounds.width - this.config.marginFromBounds ||
      testBounds.y + testBounds.height >
        containerBounds.height - this.config.marginFromBounds
    ) {
      return false;
    }

    for (const other of otherAnnotations) {
      if (other.id === annotation.id) continue;
      const otherBounds = this.calculateAnnotationBounds(other);
      if (this.checkOverlap(testBounds, otherBounds) > 0) {
        return false;
      }
    }

    return true;
  }

  calculateDistance(pos1: PositionType, pos2: PositionType): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
    );
  }

  adjustAnnotationsLayout(
    annotations: AnnotationType[],
    containerBounds: BoundsType
  ): AdjustmentResultType[] {
    const results: AdjustmentResultType[] = [];
    const workingAnnotations = [...annotations];
    let iterationCount = 0;

    while (iterationCount < this.config.maxIterations) {
      const collisionResult = this.detectCollisions(workingAnnotations);

      if (!collisionResult.hasCollision) {
        break;
      }

      collisionResult.overlaps.sort((a, b) => b.overlapArea - a.overlapArea);

      for (const overlap of collisionResult.overlaps) {
        const annotation1Index = workingAnnotations.findIndex(
          (a) => a.id === overlap.annotation1.id
        );
        const annotation2Index = workingAnnotations.findIndex(
          (a) => a.id === overlap.annotation2.id
        );

        if (annotation1Index === -1 || annotation2Index === -1) continue;

        const newPos1 = this.findNearestValidPosition(
          overlap.annotation1,
          workingAnnotations.filter((a) => a.id !== overlap.annotation1.id),
          containerBounds
        );
        const newPos2 = this.findNearestValidPosition(
          overlap.annotation2,
          workingAnnotations.filter((a) => a.id !== overlap.annotation2.id),
          containerBounds
        );

        const distance1 = this.calculateDistance(
          { x: overlap.annotation1.x || 0, y: overlap.annotation1.y || 0 },
          newPos1
        );
        const distance2 = this.calculateDistance(
          { x: overlap.annotation2.x || 0, y: overlap.annotation2.y || 0 },
          newPos2
        );

        if (distance1 <= distance2) {
          workingAnnotations[annotation1Index] = {
            ...overlap.annotation1,
            x: newPos1.x,
            y: newPos1.y,
          };
        } else {
          workingAnnotations[annotation2Index] = {
            ...overlap.annotation2,
            x: newPos2.x,
            y: newPos2.y,
          };
        }

        break;
      }

      iterationCount++;
    }

    for (let i = 0; i < annotations.length; i++) {
      const original = annotations[i];
      const adjusted = workingAnnotations[i];
      const moved = original.x !== adjusted.x || original.y !== adjusted.y;

      results.push({
        annotation: adjusted,
        newPosition: { x: adjusted.x || 0, y: adjusted.y || 0 },
        moved,
      });
    }

    return results;
  }
}

export const autoAdjustService = new AutoAdjustService();
