import type {
  Shape,
  RectangleShape,
  CircleShape,
  ArrowShape,
  PolygonShape,
} from "../types/shape";

interface ShapeComponentProps {
  shape: Shape;
  isSelected?: boolean;
  onSelect?: (shape: Shape) => void;
  onMove?: (shape: Shape, deltaX: number, deltaY: number) => void;
  onMoveEnd?: (shape: Shape, deltaX: number, deltaY: number) => void;
}

function RectangleComponent({
  shape,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
}: ShapeComponentProps & { shape: RectangleShape }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSelect) {
      onSelect(shape);
    }

    if (!onMove) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onMove(shape, currentDeltaX, currentDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (onMoveEnd && (currentDeltaX !== 0 || currentDeltaY !== 0)) {
        onMoveEnd(shape, currentDeltaX, currentDeltaY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      fill="none"
      stroke={shape.color}
      strokeWidth={shape.strokeWidth + (isSelected ? 2 : 0)}
      strokeDasharray={isSelected ? "4,2" : "none"}
      style={{ cursor: "move" }}
      onMouseDown={handleMouseDown}
    />
  );
}

function CircleComponent({
  shape,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
}: ShapeComponentProps & { shape: CircleShape }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSelect) {
      onSelect(shape);
    }

    if (!onMove) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onMove(shape, currentDeltaX, currentDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (onMoveEnd && (currentDeltaX !== 0 || currentDeltaY !== 0)) {
        onMoveEnd(shape, currentDeltaX, currentDeltaY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <circle
      cx={shape.x}
      cy={shape.y}
      r={shape.radius}
      fill="none"
      stroke={shape.color}
      strokeWidth={shape.strokeWidth + (isSelected ? 2 : 0)}
      strokeDasharray={isSelected ? "4,2" : "none"}
      style={{ cursor: "move" }}
      onMouseDown={handleMouseDown}
    />
  );
}

function ArrowComponent({
  shape,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
}: ShapeComponentProps & { shape: ArrowShape }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSelect) {
      onSelect(shape);
    }

    if (!onMove) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onMove(shape, currentDeltaX, currentDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (onMoveEnd && (currentDeltaX !== 0 || currentDeltaY !== 0)) {
        onMoveEnd(shape, currentDeltaX, currentDeltaY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const dx = shape.endX - shape.x;
  const dy = shape.endY - shape.y;
  const angle = Math.atan2(dy, dx);
  const arrowHeadLength = 15;

  const arrowHead1X =
    shape.endX - arrowHeadLength * Math.cos(angle - Math.PI / 6);
  const arrowHead1Y =
    shape.endY - arrowHeadLength * Math.sin(angle - Math.PI / 6);
  const arrowHead2X =
    shape.endX - arrowHeadLength * Math.cos(angle + Math.PI / 6);
  const arrowHead2Y =
    shape.endY - arrowHeadLength * Math.sin(angle + Math.PI / 6);

  return (
    <g style={{ cursor: "move" }} onMouseDown={handleMouseDown}>
      <line
        x1={shape.x}
        y1={shape.y}
        x2={shape.endX}
        y2={shape.endY}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth + (isSelected ? 2 : 0)}
        strokeDasharray={isSelected ? "4,2" : "none"}
      />
      <path
        d={`M ${shape.endX} ${shape.endY} L ${arrowHead1X} ${arrowHead1Y} M ${shape.endX} ${shape.endY} L ${arrowHead2X} ${arrowHead2Y}`}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth + (isSelected ? 2 : 0)}
        fill="none"
      />
    </g>
  );
}

function PolygonComponent({
  shape,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
}: ShapeComponentProps & { shape: PolygonShape }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSelect) {
      onSelect(shape);
    }

    if (!onMove) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      onMove(shape, currentDeltaX, currentDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (onMoveEnd && (currentDeltaX !== 0 || currentDeltaY !== 0)) {
        onMoveEnd(shape, currentDeltaX, currentDeltaY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const points = shape.points
    .map((point) => `${shape.x + point.x},${shape.y + point.y}`)
    .join(" ");

  return (
    <polygon
      points={points}
      fill="none"
      stroke={shape.color}
      strokeWidth={shape.strokeWidth + (isSelected ? 2 : 0)}
      strokeDasharray={isSelected ? "4,2" : "none"}
      style={{ cursor: "move" }}
      onMouseDown={handleMouseDown}
    />
  );
}

export function ShapeRenderer({
  shape,
  isSelected,
  onSelect,
  onMove,
  onMoveEnd,
}: ShapeComponentProps) {
  const commonProps = { shape, isSelected, onSelect, onMove, onMoveEnd };

  switch (shape.type) {
    case "rectangle":
      return <RectangleComponent {...commonProps} shape={shape} />;
    case "circle":
      return <CircleComponent {...commonProps} shape={shape} />;
    case "arrow":
      return <ArrowComponent {...commonProps} shape={shape} />;
    case "polygon":
      return <PolygonComponent {...commonProps} shape={shape} />;
    default:
      return null;
  }
}
