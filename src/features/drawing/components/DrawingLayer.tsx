import { useState, useRef, useEffect } from "react";
import { useShapes } from "../hooks/useShapes";
import { ShapeRenderer } from "./ShapeRenderer";
import { useAnnotationUtils } from "../../annotation/hooks/useAnnotationUtils";
import type { Shape, ShapeType, ShapeCreateType } from "../types/shape";

interface DrawingLayerProps {
  documentId: string;
  pageNumber: number;
  selectedTool: ShapeType | null;
  onShapeCreated?: (shape: Shape) => void;
  onPolygonStateChange?: (points: Array<{ x: number; y: number }>) => void;
  polygonCompleteRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  polygonCancelRef?: React.MutableRefObject<(() => void) | null>;
}

export function DrawingLayer({
  documentId,
  pageNumber,
  selectedTool,
  onShapeCreated,
  onPolygonStateChange,
  polygonCompleteRef,
  polygonCancelRef,
}: DrawingLayerProps) {
  const { shapes, createShape, updateShapeOptimistic, deleteShape } = useShapes(
    documentId,
    pageNumber
  );
  const { getPDFBounds } = useAnnotationUtils();

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
  const [selectedShapeForActions, setSelectedShapeForActions] =
    useState<Shape | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 選択ツールが変更された時に選択状態をリセット
  useEffect(() => {
    setSelectedShapeForActions(null);
  }, [selectedTool]);

  // ドキュメント全体のクリック監視で選択状態をリセット
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element;

      // ボタン自体がクリックされた場合は何もしない
      if (target.closest("button")) return;

      // SVG要素がクリックされた場合は何もしない
      if (target.closest("svg")) return;

      // それ以外の場合は選択状態をリセット
      setSelectedShapeForActions(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    // 描画ツールが選択されている場合のみ描画処理
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
    element.setAttribute("stroke", "#ef4444");
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

  // 図形モード時の図形クリック処理
  const handleShapeClickForActions = (shape: Shape) => {
    if (selectedTool !== null) {
      // 既に選択されている図形をクリックした場合は選択解除
      if (selectedShapeForActions?.id === shape.id) {
        setSelectedShapeForActions(null);
      } else {
        setSelectedShapeForActions(shape);
      }
    }
  };

  // アクションボタンからの削除
  const handleDeleteFromActions = async () => {
    if (selectedShapeForActions?.id) {
      try {
        const success = await deleteShape(selectedShapeForActions.id);
        if (success) {
          setSelectedShapeForActions(null);
        }
      } catch (error) {
        console.error("削除エラー:", error);
      }
    }
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
          pointerEvents: selectedTool ? "auto" : "none",
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
            onSelect={
              selectedTool !== null
                ? handleShapeClickForActions
                : handleShapeSelect
            }
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
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
              />
            ))}
            {/* 点をつなぐ線を表示 */}
            {polygonPoints.length > 1 && (
              <polyline
                points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ef4444"
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
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="8,4"
                opacity="0.6"
              />
            )}
          </g>
        )}
      </svg>

      {/* 図形削除ボタン */}
      {selectedShapeForActions && selectedTool !== null && (
        <div
          style={{
            position: "absolute",
            left: Math.max(
              5,
              Math.min(
                selectedShapeForActions.x - 15,
                getPDFBounds().width - 70
              )
            ),
            top: Math.max(
              5,
              Math.min(
                selectedShapeForActions.y - 35,
                getPDFBounds().height - 30
              )
            ),
            zIndex: 20,
          }}
        >
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
    </>
  );
}
