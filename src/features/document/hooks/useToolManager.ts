import { useState, useEffect, useRef } from "react";
import type { ToolType } from "../types/document";

export function useToolManager(
  externalSelectedTool?: string | null,
  onToolChange?: (tool: ToolType | null) => void,
  documentId?: string
) {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [toolStates, setToolStates] = useState<Record<string, boolean>>({
    rectangle: false,
    circle: false,
    polygon: false,
  });
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const polygonCompleteRef = useRef<(() => Promise<boolean>) | null>(null);
  const polygonCancelRef = useRef<(() => void) | null>(null);
  const onToolChangeRef = useRef(onToolChange);

  // onToolChangeの最新版を保持
  useEffect(() => {
    onToolChangeRef.current = onToolChange;
  }, [onToolChange]);

  // 外部からのselectedToolを同期
  useEffect(() => {
    setSelectedTool(externalSelectedTool as ToolType);
  }, [externalSelectedTool]);

  // ドキュメント変更時にツールリセット
  useEffect(() => {
    if (documentId) {
      setSelectedTool(null);
      setToolStates({
        rectangle: false,
        circle: false,
        polygon: false,
      });
      setPolygonPoints([]);
      if (polygonCancelRef.current) {
        polygonCancelRef.current();
      }
      if (onToolChangeRef.current) {
        onToolChangeRef.current(null);
      }
    }
  }, [documentId]);

  const handleToolChange = (tool: ToolType | null) => {
    // 解除ボタン（デフォルトモードに戻る）
    if (tool === null) {
      setSelectedTool(null);
      // モード切替ボタンの状態も初期状態にリセット
      setToolStates({
        rectangle: false,
        circle: false,
        polygon: false,
      });
      // 多角形描画中の場合はキャンセル
      if (selectedTool === "polygon" && polygonPoints.length > 0) {
        if (polygonCancelRef.current) {
          polygonCancelRef.current();
        }
      }
      if (onToolChangeRef.current) {
        onToolChangeRef.current(null);
      }
      return;
    }

    // 矢印の場合
    if (tool === "arrow") {
      if (selectedTool === "arrow") {
        setSelectedTool(null);
        if (onToolChangeRef.current) {
          onToolChangeRef.current(null);
        }
      } else {
        setSelectedTool("arrow");
        if (onToolChangeRef.current) {
          onToolChangeRef.current("arrow");
        }
      }
      return;
    }

    // 図形（rectangle, circle, polygon）の2段階切り替え
    if (tool && ["rectangle", "circle", "polygon"].includes(tool)) {
      const currentState = toolStates[tool];
      const newState = !currentState;
      const newSelectedTool = newState ? tool : null;

      // 多角形描画中の場合のキャンセル処理
      if (
        selectedTool === "polygon" &&
        polygonPoints.length > 0 &&
        newSelectedTool !== "polygon"
      ) {
        if (polygonCancelRef.current) {
          polygonCancelRef.current();
        }
      }

      setToolStates((prev) => ({ ...prev, [tool]: newState }));
      setSelectedTool(newSelectedTool);
      if (onToolChangeRef.current) {
        onToolChangeRef.current(newSelectedTool);
      }
    }
  };

  const handlePolygonStateChange = (
    points: Array<{ x: number; y: number }>
  ) => {
    setPolygonPoints(points);
  };

  const handlePolygonComplete = async () => {
    if (polygonCompleteRef.current) {
      const success = await polygonCompleteRef.current();
      if (!success) {
        alert("多角形を作成するには最低3つの点が必要です");
      }
    }
  };

  const handlePolygonCancel = () => {
    if (polygonCancelRef.current) {
      polygonCancelRef.current();
    }
  };

  const resetTools = () => {
    setSelectedTool(null);
    setToolStates({
      rectangle: false,
      circle: false,
      polygon: false,
    });
    // 多角形描画中の場合はキャンセル
    setPolygonPoints([]);
    if (polygonCancelRef.current) {
      polygonCancelRef.current();
    }
    // 親コンポーネントにツール変更を通知
    if (onToolChangeRef.current) {
      onToolChangeRef.current(null);
    }
  };

  return {
    selectedTool,
    toolStates,
    polygonPoints,
    polygonCompleteRef,
    polygonCancelRef,
    handleToolChange,
    handlePolygonStateChange,
    handlePolygonComplete,
    handlePolygonCancel,
    resetTools,
  };
}
