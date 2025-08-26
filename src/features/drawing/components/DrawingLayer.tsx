import { useState, useRef, useEffect } from "react";
import { useShapes } from "../hooks/useShapes";
import { ShapeRenderer } from "./ShapeRenderer";
import type { Shape, ShapeType, ShapeCreateType } from "../types/shape";

interface DrawingLayerProps {
  documentId: string;
  pageNumber: number;
  selectedTool: ShapeType | null;
  selectedMode?: string | null;
  onShapeCreated?: (shape: Shape) => void;
  onPolygonStateChange?: (points: Array<{ x: number; y: number }>) => void;
  polygonCompleteRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  polygonCancelRef?: React.MutableRefObject<(() => void) | null>;
}

export function DrawingLayer({
  documentId,
  pageNumber,
  selectedTool,
  selectedMode,
  onShapeCreated,
  onPolygonStateChange,
  polygonCompleteRef,
  polygonCancelRef,
}: DrawingLayerProps) {
  const { shapes, createShape, updateShapeOptimistic } = useShapes(
    documentId,
    pageNumber
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [draggingShapes, setDraggingShapes] = useState<
    Map<string, { x: number; y: number; endX?: number; endY?: number }>
  >(new Map());
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedTool) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (selectedTool === "polygon") {
      handlePolygonClick(x, y);
    } else {
      setIsDrawing(true);
      setDrawingStart({ x, y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !drawingStart || !selectedTool) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const tempElement = document.getElementById("temp-shape");
    if (tempElement) {
      updateTempShape(selectedTool, drawingStart, { x: currentX, y: currentY });
    } else {
      createTempShape(selectedTool, drawingStart, { x: currentX, y: currentY });
    }
  };

  const handleMouseUp = async (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !drawingStart || !selectedTool) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    const shapeData: ShapeCreateType = {
      documentId,
      pageNumber,
      type: selectedTool,
      x: Math.min(drawingStart.x, endX),
      y: Math.min(drawingStart.y, endY),
    };

    switch (selectedTool) {
      case "rectangle":
        shapeData.width = Math.abs(endX - drawingStart.x);
        shapeData.height = Math.abs(endY - drawingStart.y);
        break;
      case "circle":
        const radius =
          Math.sqrt(
            Math.pow(endX - drawingStart.x, 2) +
              Math.pow(endY - drawingStart.y, 2)
          ) / 2;
        shapeData.radius = radius;
        shapeData.x = (drawingStart.x + endX) / 2;
        shapeData.y = (drawingStart.y + endY) / 2;
        break;
      case "arrow":
        shapeData.x = drawingStart.x;
        shapeData.y = drawingStart.y;
        shapeData.endX = endX;
        shapeData.endY = endY;
        break;
    }

    if (shapeData.type !== "polygon") {
      const newShape = await createShape(shapeData);
      if (newShape && onShapeCreated) {
        onShapeCreated(newShape);
      }
    }

    removeTempShape();
    setIsDrawing(false);
    setDrawingStart(null);
  };

  const handlePolygonClick = (x: number, y: number) => {
    const newPoints = [...polygonPoints, { x, y }];
    setPolygonPoints(newPoints);
    if (onPolygonStateChange) {
      onPolygonStateChange(newPoints);
    }
  };

  // 外部から呼び出される多角形確定関数
  const completePolygon = async () => {
    if (polygonPoints.length < 3) {
      return false;
    }

    const shapeData: ShapeCreateType = {
      documentId,
      pageNumber,
      type: "polygon",
      x: Math.min(...polygonPoints.map((p) => p.x)),
      y: Math.min(...polygonPoints.map((p) => p.y)),
      points: polygonPoints.map((p) => ({
        x: p.x - Math.min(...polygonPoints.map((pt) => pt.x)),
        y: p.y - Math.min(...polygonPoints.map((pt) => pt.y)),
      })),
    };

    const newShape = await createShape(shapeData);
    if (newShape && onShapeCreated) {
      onShapeCreated(newShape);
    }

    setPolygonPoints([]);
    if (onPolygonStateChange) {
      onPolygonStateChange([]);
    }
    return true;
  };

  // 外部から呼び出される多角形キャンセル関数
  const cancelPolygon = () => {
    setPolygonPoints([]);
    if (onPolygonStateChange) {
      onPolygonStateChange([]);
    }
  };

  // Refオブジェクトに関数を設定
  useEffect(() => {
    if (polygonCompleteRef) {
      polygonCompleteRef.current = completePolygon;
    }
    if (polygonCancelRef) {
      polygonCancelRef.current = cancelPolygon;
    }
  });

  const createTempShape = (
    tool: ShapeType,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    if (!svgRef.current) return;

    let element: SVGElement;

    switch (tool) {
      case "rectangle":
        element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        element.setAttribute("x", Math.min(start.x, end.x).toString());
        element.setAttribute("y", Math.min(start.y, end.y).toString());
        element.setAttribute("width", Math.abs(end.x - start.x).toString());
        element.setAttribute("height", Math.abs(end.y - start.y).toString());
        break;

      case "circle":
        element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        const radius =
          Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          ) / 2;
        element.setAttribute("cx", ((start.x + end.x) / 2).toString());
        element.setAttribute("cy", ((start.y + end.y) / 2).toString());
        element.setAttribute("r", radius.toString());
        break;

      case "arrow":
        element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        element.setAttribute("x1", start.x.toString());
        element.setAttribute("y1", start.y.toString());
        element.setAttribute("x2", end.x.toString());
        element.setAttribute("y2", end.y.toString());
        break;

      default:
        return;
    }

    element.id = "temp-shape";
    element.setAttribute("fill", "none");
    element.setAttribute("stroke", "#3b82f6");
    element.setAttribute("stroke-width", "2");
    element.setAttribute("stroke-dasharray", "4,2");
    element.style.pointerEvents = "none";

    svgRef.current.appendChild(element);
  };

  const updateTempShape = (
    tool: ShapeType,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const element = document.getElementById("temp-shape");
    if (!element) return;

    switch (tool) {
      case "rectangle":
        element.setAttribute("x", Math.min(start.x, end.x).toString());
        element.setAttribute("y", Math.min(start.y, end.y).toString());
        element.setAttribute("width", Math.abs(end.x - start.x).toString());
        element.setAttribute("height", Math.abs(end.y - start.y).toString());
        break;

      case "circle":
        const radius =
          Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          ) / 2;
        element.setAttribute("cx", ((start.x + end.x) / 2).toString());
        element.setAttribute("cy", ((start.y + end.y) / 2).toString());
        element.setAttribute("r", radius.toString());
        break;

      case "arrow":
        element.setAttribute("x2", end.x.toString());
        element.setAttribute("y2", end.y.toString());
        break;
    }
  };

  const removeTempShape = () => {
    const tempElement = document.getElementById("temp-shape");
    if (tempElement) {
      tempElement.remove();
    }
  };

  const handleShapeSelect = () => {
    // 図形選択機能は無効
  };

  const handleShapeMove = (shape: Shape, deltaX: number, deltaY: number) => {
    const newPosition = {
      x: shape.x + deltaX,
      y: shape.y + deltaY,
    };

    if (shape.type === "arrow") {
      setDraggingShapes((prev) =>
        new Map(prev).set(shape.id, {
          ...newPosition,
          endX: shape.endX + deltaX,
          endY: shape.endY + deltaY,
        })
      );
    } else {
      setDraggingShapes((prev) => new Map(prev).set(shape.id, newPosition));
    }
  };

  const handleShapeMoveEnd = async (
    shape: Shape,
    deltaX: number,
    deltaY: number
  ) => {
    let updateData: any = {
      id: shape.id,
      x: shape.x + deltaX,
      y: shape.y + deltaY,
    };

    if (shape.type === "arrow") {
      updateData.endX = shape.endX + deltaX;
      updateData.endY = shape.endY + deltaY;
    }

    // draggingStateを削除する前に楽観的更新を実行
    await updateShapeOptimistic(updateData);

    // その後draggingStateを削除
    setDraggingShapes((prev) => {
      const newMap = new Map(prev);
      newMap.delete(shape.id);
      return newMap;
    });
  };

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents:
            selectedTool || selectedMode === null ? "auto" : "none",
          zIndex: 5,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {shapes.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={
              draggingShapes.has(shape.id)
                ? { ...shape, ...draggingShapes.get(shape.id)! }
                : shape
            }
            isSelected={false}
            onSelect={handleShapeSelect}
            onMove={handleShapeMove}
            onMoveEnd={handleShapeMoveEnd}
          />
        ))}

        {polygonPoints.length > 0 && selectedTool === "polygon" && (
          <g>
            {/* 確定した点を表示 */}
            {polygonPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
            ))}
            {/* 点をつなぐ線を表示 */}
            {polygonPoints.length > 1 && (
              <polyline
                points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
            )}
            {/* 最初と最後の点を結ぶ線（プレビュー） */}
            {polygonPoints.length >= 3 && (
              <line
                x1={polygonPoints[polygonPoints.length - 1].x}
                y1={polygonPoints[polygonPoints.length - 1].y}
                x2={polygonPoints[0].x}
                y2={polygonPoints[0].y}
                stroke="#3b82f6"
                strokeWidth="1"
                strokeDasharray="8,4"
                opacity="0.6"
              />
            )}
          </g>
        )}
      </svg>
    </>
  );
}
