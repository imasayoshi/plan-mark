import { useState, useEffect, useRef } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";
import { annotationService } from "../services/annotationService";
import type {
  AnnotationType,
  AnnotationCreateType,
  AnnotationUpdateType,
} from "../types/annotation";

// クライアントを遅延初期化するために関数として定義
const getClient = () => generateClient<Schema>();

// データ変換ユーティリティ関数
const convertToAnnotation = (data: any): AnnotationType => {
  return {
    id: data.id,
    documentId: data.documentId,
    pageNumber: data.pageNumber,
    content: data.content,
    x: data.x,
    y: data.y,
    leaderX: data.leaderX,
    leaderY: data.leaderY,
    width: data.width,
    height: data.height,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const useAnnotations = (
  documentId: string | null,
  pageNumber: number,
  isPdfLoaded: boolean = true
) => {
  const [annotations, setAnnotations] = useState<AnnotationType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 楽観的更新のトラッキング
  const optimisticUpdatesRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  const loadAnnotations = async () => {
    if (!documentId || !isPdfLoaded) return;

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

      // 作成成功時の楽観的更新：重複チェック付きで追加
      setAnnotations((prev) => {
        if (prev.some((ann) => ann.id === annotation.id)) {
          return prev; // 既に存在する場合はスキップ（サブスクリプションで追加済み）
        }
        return [...prev, annotation];
      });

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
    // 楽観的更新のトラッキングに追加
    optimisticUpdatesRef.current.add(data.id);

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
      // 成功時に楽観的更新のトラッキングから削除
      setTimeout(() => {
        optimisticUpdatesRef.current.delete(data.id);
      }, 1000); // 1秒後に削除（サブスクリプション更新との重複を避けるため）
    } catch (err) {
      // エラー時は楽観的更新のトラッキングから削除
      optimisticUpdatesRef.current.delete(data.id);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update annotation";
      setError(errorMessage);
    }
  };

  const deleteAnnotation = async (id: string): Promise<boolean> => {
    try {
      // 楽観的削除：即座にローカルステートから削除
      setAnnotations((prev) => prev.filter((a) => a.id !== id));

      await annotationService.deleteAnnotation(id);
      return true;
    } catch (err) {
      // エラー時は再度読み込んで復元
      loadAnnotations();
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete annotation";
      setError(errorMessage);
      return false;
    }
  };

  // サブスクリプションのセットアップ
  const setupSubscriptions = () => {
    if (!documentId || !isPdfLoaded) return;

    // 既存のサブスクリプションをクリーンアップ
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current = [];

    // onCreate サブスクリプション
    const createSub = getClient()
      .models.Annotation.onCreate({
        filter: {
          documentId: { eq: documentId },
          pageNumber: { eq: pageNumber },
        },
      })
      .subscribe({
        next: (data) => {
          const newAnnotation = convertToAnnotation(data);
          setAnnotations((prev) => {
            // 重複チェック
            if (prev.some((ann) => ann.id === newAnnotation.id)) {
              return prev;
            }
            return [...prev, newAnnotation];
          });
        },
        error: (err) => console.error("Create subscription error:", err),
      });

    // onUpdate サブスクリプション
    const updateSub = getClient()
      .models.Annotation.onUpdate({
        filter: {
          documentId: { eq: documentId },
          pageNumber: { eq: pageNumber },
        },
      })
      .subscribe({
        next: (data) => {
          const updatedAnnotation = convertToAnnotation(data);

          // 楽観的更新中の場合はスキップ
          if (optimisticUpdatesRef.current.has(updatedAnnotation.id)) {
            return;
          }

          setAnnotations((prev) =>
            prev.map((ann) =>
              ann.id === updatedAnnotation.id ? updatedAnnotation : ann
            )
          );
        },
        error: (err) => console.error("Update subscription error:", err),
      });

    // onDelete サブスクリプション
    const deleteSub = getClient()
      .models.Annotation.onDelete({
        filter: {
          documentId: { eq: documentId },
          pageNumber: { eq: pageNumber },
        },
      })
      .subscribe({
        next: (data) => {
          setAnnotations((prev) => prev.filter((ann) => ann.id !== data.id));
        },
        error: (err) => console.error("Delete subscription error:", err),
      });

    subscriptionsRef.current = [
      { unsubscribe: createSub.unsubscribe },
      { unsubscribe: updateSub.unsubscribe },
      { unsubscribe: deleteSub.unsubscribe },
    ];
  };

  // ドキュメントIDが変更された時は即座にアノテーションをクリア（最優先）
  useEffect(() => {
    setAnnotations([]);
    optimisticUpdatesRef.current.clear();
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current = [];
    setError(null); // エラー状態もクリア
  }, [documentId]);

  // PDF読み込み状態とページ変更に応じた処理
  useEffect(() => {
    // ドキュメントIDがない、またはPDFが読み込まれていない場合はアノテーションをクリア
    if (!documentId || !isPdfLoaded) {
      setAnnotations([]);
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
      return;
    }

    // 全ての条件が満たされている場合のみアノテーションを読み込み
    loadAnnotations();
    setupSubscriptions();

    // クリーンアップ
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [documentId, pageNumber, isPdfLoaded]);

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
