import { useState, useEffect } from "react";
import { annotationService } from "../services/annotationService";
import type {
  AnnotationType,
  AnnotationCreateType,
  AnnotationUpdateType,
} from "../types/annotation";

export const useAnnotations = (
  documentId: string | null,
  pageNumber: number
) => {
  const [annotations, setAnnotations] = useState<AnnotationType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnnotations = async () => {
    if (!documentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await annotationService.getAnnotationsByDocument(
        documentId,
        pageNumber
      );
      setAnnotations(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load annotations";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const createAnnotation = async (
    data: AnnotationCreateType
  ): Promise<AnnotationType | null> => {
    try {
      const annotation = await annotationService.createAnnotation(data);
      setAnnotations((prev) => [...prev, annotation]);
      return annotation;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create annotation";
      setError(errorMessage);
      return null;
    }
  };

  const updateAnnotation = async (
    data: AnnotationUpdateType
  ): Promise<AnnotationType | null> => {
    try {
      const annotation = await annotationService.updateAnnotation(data);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === data.id ? annotation : a))
      );
      return annotation;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update annotation";
      setError(errorMessage);
      return null;
    }
  };

  const updateAnnotationOptimistic = async (
    data: AnnotationUpdateType
  ): Promise<void> => {
    // 楽観的更新：即座にローカルステートを更新
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id === data.id) {
          return { ...a, ...data };
        }
        return a;
      })
    );

    // 非同期でDBを更新
    try {
      await annotationService.updateAnnotation(data);
    } catch (err) {
      // エラー時は元のデータで復元（簡略化のため省略）
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update annotation";
      setError(errorMessage);
    }
  };

  const deleteAnnotation = async (id: string): Promise<boolean> => {
    try {
      await annotationService.deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete annotation";
      setError(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadAnnotations();
  }, [documentId, pageNumber]);

  return {
    annotations,
    isLoading,
    error,
    createAnnotation,
    updateAnnotation,
    updateAnnotationOptimistic,
    deleteAnnotation,
    reloadAnnotations: loadAnnotations,
    clearError: () => setError(null),
  };
};
