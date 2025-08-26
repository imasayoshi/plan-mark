import type { AnnotationType } from "../types/annotation";

interface AnnotationWithLeaderProps {
  annotation: AnnotationType;
  selectedTool?: string | null;
  onMove?: (annotation: AnnotationType, deltaX: number, deltaY: number) => void;
  onMoveEnd?: (
    annotation: AnnotationType,
    deltaX: number,
    deltaY: number
  ) => void;
}

export function AnnotationWithLeader({
  annotation,
  selectedTool,
  onMove,
  onMoveEnd,
}: AnnotationWithLeaderProps) {
  const leaderX = annotation.leaderX ?? annotation.x ?? 0;
  const leaderY = annotation.leaderY ?? annotation.y ?? 0;
  const boxX = annotation.x ?? 0;
  const boxY = annotation.y ?? 0;
  const boxWidth = annotation.width ?? 20;
  const boxHeight = annotation.height ?? 20;

  // 引き出し線とコメントボックス境界の交点を計算
  const calculateLineBoxIntersection = () => {
    const boxCenterX = boxX + boxWidth / 2;
    const boxCenterY = boxY + boxHeight / 2;

    // 引き出し線の方向ベクトル
    const dx = boxCenterX - leaderX;
    const dy = boxCenterY - leaderY;

    if (dx === 0 && dy === 0) {
      return { x: boxCenterX, y: boxCenterY };
    }

    // ボックスの各辺との交点を計算
    const intersections = [];

    // 上辺との交点
    if (dy !== 0) {
      const t = (boxY - leaderY) / dy;
      const x = leaderX + t * dx;
      if (t > 0 && x >= boxX && x <= boxX + boxWidth) {
        intersections.push({ x, y: boxY, distance: t });
      }
    }

    // 下辺との交点
    if (dy !== 0) {
      const t = (boxY + boxHeight - leaderY) / dy;
      const x = leaderX + t * dx;
      if (t > 0 && x >= boxX && x <= boxX + boxWidth) {
        intersections.push({ x, y: boxY + boxHeight, distance: t });
      }
    }

    // 左辺との交点
    if (dx !== 0) {
      const t = (boxX - leaderX) / dx;
      const y = leaderY + t * dy;
      if (t > 0 && y >= boxY && y <= boxY + boxHeight) {
        intersections.push({ x: boxX, y, distance: t });
      }
    }

    // 右辺との交点
    if (dx !== 0) {
      const t = (boxX + boxWidth - leaderX) / dx;
      const y = leaderY + t * dy;
      if (t > 0 && y >= boxY && y <= boxY + boxHeight) {
        intersections.push({ x: boxX + boxWidth, y, distance: t });
      }
    }

    // 最も近い交点を選択
    if (intersections.length > 0) {
      const closest = intersections.reduce((min, current) =>
        current.distance < min.distance ? current : min
      );
      return { x: closest.x, y: closest.y };
    }

    // 交点が見つからない場合はボックス中央を返す
    return { x: boxCenterX, y: boxCenterY };
  };

  const intersection = calculateLineBoxIntersection();

  const isDraggable = selectedTool === null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable || !onMove) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onMove(annotation, currentDeltaX, currentDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (onMoveEnd && (currentDeltaX !== 0 || currentDeltaY !== 0)) {
        onMoveEnd(annotation, currentDeltaX, currentDeltaY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 8,
        }}
      >
        <line
          x1={leaderX}
          y1={leaderY}
          x2={intersection.x}
          y2={intersection.y}
          stroke="#ff9800"
          strokeWidth="1.5"
        />

        <circle cx={leaderX} cy={leaderY} r="2" fill="#ff9800" />
      </svg>

      {/* 編集時と同じtextareaを無効化して表示 */}
      <textarea
        readOnly
        value={annotation.content || ""}
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          left: boxX,
          top: boxY,
          width: boxWidth,
          height: boxHeight,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          border: "2px solid #ff9800",
          borderRadius: "8px",
          padding: "6px",
          fontSize: "11px",
          lineHeight: "1.3",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          zIndex: 10,
          pointerEvents: isDraggable ? "auto" : "none",
          boxSizing: "border-box",
          overflow: "hidden",
          color: "#333",
          cursor: isDraggable ? "move" : "default",
        }}
      />
    </div>
  );
}
