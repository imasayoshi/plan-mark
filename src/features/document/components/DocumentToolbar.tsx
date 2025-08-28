import { AutoAdjustButton } from "../../annotation-auto-adjust";
import { PageNavigation } from "./PageNavigation";
import type { DocumentToolbarPropsType, ToolType } from "../types/document";

export function DocumentToolbar({
  selectedTool,
  polygonPoints,
  isAdjusting,
  hasCollisions,
  pageNumber,
  numPages,
  onToolChange,
  onPolygonComplete,
  onPolygonCancel,
  onAutoAdjust,
  onPageChange,
}: DocumentToolbarPropsType) {
  const tools = [
    {
      value: "rectangle",
      label: "四角形",
      icon: "▬",
      hatchIcon: "⫽",
    },
    { value: "circle", label: "円", icon: "●", hatchIcon: "⊙" },
    { value: "arrow", label: "矢印", icon: "→" },
    {
      value: "polygon",
      label: "多角形",
      icon: "⬟",
      hatchIcon: "⬢",
    },
  ];

  return (
    <div
      style={{
        padding: "16px 0px 16px 0px",
        backgroundColor: "white",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexShrink: 0,
        zIndex: 10,
        position: "relative",
        width: "100%",
      }}
    >
      {/* 左側スペーサー - モード表示と解除ボタン */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          minWidth: "200px",
          paddingLeft: "16px",
        }}
      >
        <div
          style={{
            fontSize: "16px",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {!selectedTool && (
            <>
              <span>デフォルトモード</span>
            </>
          )}

          {selectedTool === "rectangle" && "四角形描画モード"}
          {selectedTool === "circle" && "円描画モード"}
          {selectedTool === "arrow" && "矢印描画モード"}
          {selectedTool === "polygon" && (
            <>
              多角形描画モード
              {polygonPoints.length > 0 && (
                <span
                  style={{
                    color: "#3b82f6",
                    fontWeight: "500",
                  }}
                >
                  ({polygonPoints.length}点)
                </span>
              )}
            </>
          )}
          {selectedTool &&
            !(selectedTool === "polygon" && polygonPoints.length > 0) && (
              <button
                onClick={() => onToolChange(null)}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#6b7280",
                  marginLeft: "8px",
                }}
                title="選択モードに戻る"
              >
                解除
              </button>
            )}

          {/* 多角形描画中の操作ボタン */}
          {selectedTool === "polygon" && polygonPoints.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              <button
                onClick={onPolygonComplete}
                disabled={polygonPoints.length < 3}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor:
                    polygonPoints.length >= 3 ? "#16a34a" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: polygonPoints.length >= 3 ? "pointer" : "not-allowed",
                  fontWeight: "500",
                }}
                title={
                  polygonPoints.length >= 3 ? "多角形を確定" : "最低3点必要"
                }
              >
                確定
              </button>
              <button
                onClick={onPolygonCancel}
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
                title="多角形描画をキャンセル"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 中央のツールバー（モード選択ボタン） */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {tools.map((tool) => {
          const isSelected = selectedTool === tool.value;

          // 境界線と背景色の決定
          let borderColor = "#d1d5db";
          let backgroundColor = "white";
          let buttonTitle = tool.label;

          if (isSelected) {
            borderColor = "#3b82f6";
            backgroundColor = "#eff6ff";
          }

          return (
            <button
              key={tool.value}
              onClick={() => onToolChange(tool.value as ToolType)}
              title={buttonTitle}
              style={{
                padding: "8px",
                border: `2px solid ${borderColor}`,
                borderRadius: "6px",
                backgroundColor,
                cursor: "pointer",
                fontSize: "16px",
                minWidth: "40px",
                minHeight: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {tool.icon}
            </button>
          );
        })}

        {/* 自動調整ボタン */}
        <div style={{ marginLeft: "16px" }}>
          <AutoAdjustButton
            onClick={onAutoAdjust}
            isAdjusting={isAdjusting}
            hasCollisions={hasCollisions}
          />
        </div>
      </div>

      {/* 右側のページナビゲーション */}
      <div style={{ paddingRight: "16px" }}>
        <PageNavigation
          pageNumber={pageNumber}
          numPages={numPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
