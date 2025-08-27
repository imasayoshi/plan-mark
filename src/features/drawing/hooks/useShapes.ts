import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import { shapeService } from "../services/shapeService";
import type { Shape, ShapeCreateType, ShapeUpdateType } from "../types/shape";

// クライアントを遅延初期化するために関数として定義
const getClient = () => generateClient<Schema>();

export function useShapes(documentId: string, pageNumber: number) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ドキュメントIDが変更された時は即座に図形をクリア（最優先）
  useEffect(() => {
    setShapes([]);
    setIsLoading(false); // ローディング状態もリセット
  }, [documentId]);

  // ドキュメントIDとページ変更に応じた処理
  useEffect(() => {
    if (!documentId) {
      setShapes([]);
      return;
    }
    loadShapes();
  }, [documentId, pageNumber]);

  // リアルタイムサブスクリプション
  useEffect(() => {
    if (!documentId) return;

    // 新しいシェイプの作成をリアルタイムで監視
    const createSub = getClient()
      .models.Shape.onCreate({
        filter: {
          and: [
            { documentId: { eq: documentId } },
            { pageNumber: { eq: pageNumber } },
          ],
        },
      })
      .subscribe({
        next: (data) => {
          if (
            data &&
            data.documentId === documentId &&
            data.pageNumber === pageNumber
          ) {
            const newShape = convertToShape(data);
            setShapes((prev) => {
              // 重複を避けるためIDチェック
              if (prev.some((shape) => shape.id === newShape.id)) {
                return prev;
              }
              return [...prev, newShape];
            });
          }
        },
        error: (error) =>
          console.error("Shape create subscription error:", error),
      });

    // シェイプの更新をリアルタイムで監視
    const updateSub = getClient()
      .models.Shape.onUpdate({
        filter: {
          and: [
            { documentId: { eq: documentId } },
            { pageNumber: { eq: pageNumber } },
          ],
        },
      })
      .subscribe({
        next: (data) => {
          if (
            data &&
            data.documentId === documentId &&
            data.pageNumber === pageNumber
          ) {
            const updatedShape = convertToShape(data);
            setShapes((prev) =>
              prev.map((shape) =>
                shape.id === updatedShape.id ? updatedShape : shape
              )
            );
          }
        },
        error: (error) =>
          console.error("Shape update subscription error:", error),
      });

    // シェイプの削除をリアルタイムで監視
    const deleteSub = getClient()
      .models.Shape.onDelete({
        filter: {
          and: [
            { documentId: { eq: documentId } },
            { pageNumber: { eq: pageNumber } },
          ],
        },
      })
      .subscribe({
        next: (data) => {
          if (
            data &&
            data.documentId === documentId &&
            data.pageNumber === pageNumber
          ) {
            setShapes((prev) => prev.filter((shape) => shape.id !== data.id));
          }
        },
        error: (error) =>
          console.error("Shape delete subscription error:", error),
      });

    // クリーンアップ
    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, [documentId, pageNumber]);

  const loadShapes = async () => {
    if (!documentId) return;

    setIsLoading(true);
    try {
      const loadedShapes = await shapeService.getShapes(documentId, pageNumber);
      setShapes(loadedShapes);
    } catch (error) {
      console.error("Failed to load shapes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createShape = async (
    shapeData: ShapeCreateType
  ): Promise<Shape | null> => {
    try {
      const newShape = await shapeService.createShape(shapeData);
      setShapes((prev) => [...prev, newShape]);
      return newShape;
    } catch (error) {
      console.error("Failed to create shape:", error);
      return null;
    }
  };

  const updateShape = async (
    updateData: ShapeUpdateType
  ): Promise<Shape | null> => {
    try {
      const updatedShape = await shapeService.updateShape(updateData);
      if (updatedShape) {
        setShapes((prev) =>
          prev.map((shape) =>
            shape.id === updateData.id ? updatedShape : shape
          )
        );
      }
      return updatedShape;
    } catch (error) {
      console.error("Failed to update shape:", error);
      return null;
    }
  };

  const updateShapeOptimistic = async (
    updateData: ShapeUpdateType
  ): Promise<void> => {
    // 楽観的更新：即座にローカルステートを更新
    setShapes((prev) =>
      prev.map((shape) => {
        if (shape.id === updateData.id) {
          return { ...shape, ...updateData };
        }
        return shape;
      })
    );

    // 非同期でDBを更新
    try {
      await shapeService.updateShape(updateData);
    } catch (error) {
      // エラー時は元のデータで復元（簡略化のため省略）
      console.error("Failed to update shape:", error);
    }
  };

  const deleteShape = async (id: string): Promise<boolean> => {
    try {
      const success = await shapeService.deleteShape(id);
      if (success) {
        setShapes((prev) => prev.filter((shape) => shape.id !== id));
      }
      return success;
    } catch (error) {
      console.error("Failed to delete shape:", error);
      return false;
    }
  };

  // ShapeService.tsのconvertToShapeと同じ実装
  const convertToShape = (data: any): Shape => {
    const properties =
      typeof data.properties === "string"
        ? JSON.parse(data.properties)
        : data.properties || {};

    switch (data.type) {
      case "rectangle":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "rectangle",
          x: data.x,
          y: data.y,
          width: properties.width || 100,
          height: properties.height || 50,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "circle":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "circle",
          x: data.x,
          y: data.y,
          radius: properties.radius || 50,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "arrow":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "arrow",
          x: data.x,
          y: data.y,
          endX: properties.endX || data.x + 100,
          endY: properties.endY || data.y,
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      case "polygon":
        return {
          id: data.id,
          documentId: data.documentId,
          pageNumber: data.pageNumber,
          type: "polygon",
          x: data.x,
          y: data.y,
          points: properties.points || [
            { x: 0, y: -40 },
            { x: 30, y: 20 },
            { x: -30, y: 20 },
          ],
          color: data.color,
          strokeWidth: data.strokeWidth,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      default:
        throw new Error(`Unsupported shape type: ${data.type}`);
    }
  };

  return {
    shapes,
    isLoading,
    createShape,
    updateShape,
    updateShapeOptimistic,
    deleteShape,
    loadShapes,
  };
}
