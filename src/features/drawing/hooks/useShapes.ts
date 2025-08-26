import { useState, useEffect } from "react";
import { shapeService } from "../services/shapeService";
import type { Shape, ShapeCreateType, ShapeUpdateType } from "../types/shape";

export function useShapes(documentId: string, pageNumber: number) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    loadShapes();
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
