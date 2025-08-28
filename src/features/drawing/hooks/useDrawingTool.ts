import { useState, useRef, useEffect } from "react";
import type { ShapeType, ShapeCreateType, Shape } from "../types/shape";

export function useDrawingTool(
  selectedTool: ShapeType | null,
  documentId: string,
  pageNumber: number,
  createShape: (data: ShapeCreateType) => Promise<Shape | null>,
  onShapeCreated?: (shape: Shape) => void
) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
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
      // SVG内のクリックでない場合、選択状態をリセット
      if (!target.closest("svg") || !target.closest(".drawing-layer")) {
        setSelectedShapeForActions(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const removeTempShape = () => {
    if (svgRef.current) {
      const tempShape = svgRef.current.querySelector(".temp-shape");
      if (tempShape) {
        tempShape.remove();
      }
    }
  };

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedTool || selectedTool === "polygon") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setIsDrawing(true);
    setDrawingStart({ x, y });
    setSelectedShapeForActions(null);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (
      !isDrawing ||
      !drawingStart ||
      !selectedTool ||
      selectedTool === "polygon"
    )
      return;

    const rect = event.currentTarget.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    removeTempShape();

    if (svgRef.current) {
      let tempElement: SVGElement | null = null;

      switch (selectedTool) {
        case "rectangle":
          tempElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
          );
          tempElement.setAttribute(
            "x",
            String(Math.min(drawingStart.x, currentX))
          );
          tempElement.setAttribute(
            "y",
            String(Math.min(drawingStart.y, currentY))
          );
          tempElement.setAttribute(
            "width",
            String(Math.abs(currentX - drawingStart.x))
          );
          tempElement.setAttribute(
            "height",
            String(Math.abs(currentY - drawingStart.y))
          );
          tempElement.setAttribute("fill", "rgba(59, 130, 246, 0.3)");
          tempElement.setAttribute("stroke", "#3b82f6");
          tempElement.setAttribute("stroke-width", "2");
          break;

        case "circle":
          tempElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          const centerX = (drawingStart.x + currentX) / 2;
          const centerY = (drawingStart.y + currentY) / 2;
          const radius =
            Math.sqrt(
              Math.pow(currentX - drawingStart.x, 2) +
                Math.pow(currentY - drawingStart.y, 2)
            ) / 2;
          tempElement.setAttribute("cx", String(centerX));
          tempElement.setAttribute("cy", String(centerY));
          tempElement.setAttribute("r", String(radius));
          tempElement.setAttribute("fill", "rgba(59, 130, 246, 0.3)");
          tempElement.setAttribute("stroke", "#3b82f6");
          tempElement.setAttribute("stroke-width", "2");
          break;

        case "arrow":
          tempElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
          );
          tempElement.setAttribute("x1", String(drawingStart.x));
          tempElement.setAttribute("y1", String(drawingStart.y));
          tempElement.setAttribute("x2", String(currentX));
          tempElement.setAttribute("y2", String(currentY));
          tempElement.setAttribute("stroke", "#3b82f6");
          tempElement.setAttribute("stroke-width", "2");
          tempElement.setAttribute("marker-end", "url(#arrowhead)");
          break;
      }

      if (tempElement) {
        tempElement.setAttribute("class", "temp-shape");
        tempElement.style.pointerEvents = "none";
        svgRef.current.appendChild(tempElement);
      }
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

  const handleShapeMove = (shape: Shape, deltaX: number, deltaY: number) => {
    setDraggingShapes((prev) => {
      const newMap = new Map(prev);
      const newPosition: {
        x: number;
        y: number;
        endX?: number;
        endY?: number;
      } = {
        x: (shape.x || 0) + deltaX,
        y: (shape.y || 0) + deltaY,
      };

      if (shape.type === "arrow") {
        newPosition.endX = (shape.endX || 0) + deltaX;
        newPosition.endY = (shape.endY || 0) + deltaY;
      }

      newMap.set(shape.id, newPosition);
      return newMap;
    });
  };

  const handleShapeMoveEnd = async (
    shape: Shape,
    deltaX: number,
    deltaY: number,
    updateShapeOptimistic: (updates: any) => Promise<void>
  ) => {
    const updates: any = {
      id: shape.id,
      x: (shape.x || 0) + deltaX,
      y: (shape.y || 0) + deltaY,
    };

    if (shape.type === "arrow") {
      updates.endX = (shape.endX || 0) + deltaX;
      updates.endY = (shape.endY || 0) + deltaY;
    } else if (shape.type === "polygon") {
      // 多角形の場合は、基準座標は更新せず、points配列はそのまま保持
      // 実際の移動はShapeRenderer側で shape.x + point.x で計算される
      updates.points = shape.points;
    }

    await updateShapeOptimistic(updates);

    setDraggingShapes((prev) => {
      const newMap = new Map(prev);
      newMap.delete(shape.id);
      return newMap;
    });
  };

  const handleShapeSelect = (shape: Shape) => {
    // 図形を選択（ツールに関係なく選択可能）
    setSelectedShapeForActions(shape);
  };

  return {
    svgRef,
    isDrawing,
    draggingShapes,
    selectedShapeForActions,
    setSelectedShapeForActions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleShapeMove,
    handleShapeMoveEnd,
    handleShapeSelect,
  };
}
