import { useEffect, useCallback } from "react";
import { useShapes } from "../hooks/useShapes";
import { useDrawingTool } from "../hooks/useDrawingTool";
import { usePolygonDrawing } from "../hooks/usePolygonDrawing";
import { ShapeRenderer } from "./ShapeRenderer";
import { PolygonRenderer } from "./PolygonRenderer";
import { ShapeActions } from "./ShapeActions";
import type { DrawingLayerPropsType } from "../types/shape";

export function DrawingLayer({
  documentId,
  pageNumber,
  selectedTool,
  onShapeCreated,
  onPolygonStateChange,
  polygonCompleteRef,
  polygonCancelRef,
}: DrawingLayerPropsType) {
  const { shapes, createShape, updateShapeOptimistic, deleteShape } = useShapes(
    documentId,
    pageNumber
  );

  // 図形描画ツール管理
  const {
    svgRef,
    draggingShapes,
    selectedShapeForActions,
    setSelectedShapeForActions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleShapeMove,
    handleShapeMoveEnd,
    handleShapeSelect,
  } = useDrawingTool(
    selectedTool,
    documentId,
    pageNumber,
    createShape,
    onShapeCreated
  );

  // 多角形描画管理
  const { polygonPoints, handlePolygonClick } = usePolygonDrawing(
    selectedTool,
    documentId,
    pageNumber,
    createShape,
    onShapeCreated,
    onPolygonStateChange,
    polygonCompleteRef,
    polygonCancelRef
  );

  // 図形削除処理
  const handleShapeDelete = useCallback(
    async (shape: any) => {
      try {
        await deleteShape(shape.id);
        setSelectedShapeForActions(null);
      } catch (error) {
        console.error("図形削除エラー:", error);
      }
    },
    [deleteShape, setSelectedShapeForActions]
  );

  // キーボードでの削除機能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // バックスペースまたはデリートキーが押され、選択された図形がある場合
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedShapeForActions
      ) {
        event.preventDefault();
        handleShapeDelete(selectedShapeForActions);
      }
    };

    // イベントリスナーを追加
    document.addEventListener("keydown", handleKeyDown);

    // クリーンアップ関数
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedShapeForActions, handleShapeDelete]);

  // 統合されたマウスイベントハンドラ
  const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    // イベントのバブリングを防ぐ
    event.preventDefault();
    event.stopPropagation();

    if (selectedTool === "polygon") {
      handlePolygonClick(event);
    } else {
      handleMouseDown(event);
    }
  };

  // 図形移動のハンドラ（updateShapeOptimisticを渡す）
  const handleShapeMoveEndWithUpdate = (
    shape: any,
    deltaX: number,
    deltaY: number
  ) => {
    handleShapeMoveEnd(shape, deltaX, deltaY, updateShapeOptimistic);
  };

  return (
    <div
      className="drawing-layer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: selectedTool ? "auto" : "none",
        zIndex: 5,
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "auto",
        }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* 矢印マーカーの定義 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
          </marker>
        </defs>

        {/* 既存図形の表示 */}
        {shapes.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={
              draggingShapes.has(shape.id)
                ? { ...shape, ...draggingShapes.get(shape.id)! }
                : shape
            }
            isSelected={selectedShapeForActions?.id === shape.id}
            onSelect={handleShapeSelect}
            onMove={handleShapeMove}
            onMoveEnd={handleShapeMoveEndWithUpdate}
          />
        ))}

        {/* 多角形描画中のUI */}
        <PolygonRenderer
          polygonPoints={polygonPoints}
          selectedTool={selectedTool}
        />

        {/* アクションボタン */}
        <ShapeActions
          selectedShape={selectedShapeForActions}
          onDelete={handleShapeDelete}
        />
      </svg>
    </div>
  );
}
