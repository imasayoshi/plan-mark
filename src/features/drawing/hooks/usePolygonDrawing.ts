import { useState, useEffect, useRef } from "react";
import type { ShapeCreateType, Shape } from "../types/shape";

export function usePolygonDrawing(
  selectedTool: string | null,
  documentId: string,
  pageNumber: number,
  createShape: (data: ShapeCreateType) => Promise<Shape | null>,
  onShapeCreated?: (shape: Shape) => void,
  onPolygonStateChange?: (points: Array<{ x: number; y: number }>) => void,
  polygonCompleteRef?: React.MutableRefObject<(() => Promise<boolean>) | null>,
  polygonCancelRef?: React.MutableRefObject<(() => void) | null>
) {
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const onPolygonStateChangeRef = useRef(onPolygonStateChange);

  // 最新のコールバック関数を保持
  useEffect(() => {
    onPolygonStateChangeRef.current = onPolygonStateChange;
  }, [onPolygonStateChange]);

  // 多角形の点を追加
  const addPolygonPoint = (x: number, y: number) => {
    if (selectedTool !== "polygon") return;

    setPolygonPoints((prev) => {
      const newPoints = [...prev, { x, y }];
      // setStateの後にコールバックを遅延実行
      setTimeout(() => {
        if (onPolygonStateChangeRef.current) {
          onPolygonStateChangeRef.current(newPoints);
        }
      }, 0);
      return newPoints;
    });
  };

  // 多角形を完成させる
  const completePolygon = async (): Promise<boolean> => {
    if (polygonPoints.length < 3) {
      return false;
    }

    // 基準点を計算
    const minX = Math.min(...polygonPoints.map((p) => p.x));
    const minY = Math.min(...polygonPoints.map((p) => p.y));

    // 基準点からの相対座標に変換
    const relativePoints = polygonPoints.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    const shapeData: ShapeCreateType = {
      documentId,
      pageNumber,
      type: "polygon",
      x: minX,
      y: minY,
      points: relativePoints,
    };

    const newShape = await createShape(shapeData);
    if (newShape && onShapeCreated) {
      onShapeCreated(newShape);
    }

    setPolygonPoints([]);
    // setStateの後にコールバックを遅延実行
    setTimeout(() => {
      if (onPolygonStateChangeRef.current) {
        onPolygonStateChangeRef.current([]);
      }
    }, 0);

    return true;
  };

  // 多角形描画をキャンセル
  const cancelPolygon = () => {
    setPolygonPoints([]);
    // setStateの後にコールバックを遅延実行
    setTimeout(() => {
      if (onPolygonStateChangeRef.current) {
        onPolygonStateChangeRef.current([]);
      }
    }, 0);
  };

  // ref経由で関数を外部に公開
  useEffect(() => {
    if (polygonCompleteRef) {
      polygonCompleteRef.current = completePolygon;
    }
  }, [polygonCompleteRef, polygonPoints, documentId, pageNumber]);

  useEffect(() => {
    if (polygonCancelRef) {
      polygonCancelRef.current = cancelPolygon;
    }
  }, [polygonCancelRef]);

  // ツールが変更された時に多角形描画をリセット
  useEffect(() => {
    if (selectedTool !== "polygon") {
      setPolygonPoints([]);
      // setStateの後にコールバックを遅延実行
      setTimeout(() => {
        if (onPolygonStateChangeRef.current) {
          onPolygonStateChangeRef.current([]);
        }
      }, 0);
    }
  }, [selectedTool]);

  const handlePolygonClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (selectedTool !== "polygon") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    addPolygonPoint(x, y);
  };

  return {
    polygonPoints,
    handlePolygonClick,
    completePolygon,
    cancelPolygon,
  };
}
