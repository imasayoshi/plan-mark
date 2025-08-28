import { useAnnotationUtils } from "../../annotation/hooks/useAnnotationUtils";
import type { ShapeActionsPropsType } from "../types/shape";

export function ShapeActions({
  selectedShape,
  onDelete,
}: ShapeActionsPropsType) {
  const { getPDFBounds } = useAnnotationUtils();

  if (!selectedShape) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(selectedShape);
  };

  // 削除ボタンの位置を計算（図形の右上あたり）
  const buttonX = Math.max(
    5,
    Math.min((selectedShape.x || 0) + 20, getPDFBounds().width - 80)
  );
  const buttonY = Math.max(5, (selectedShape.y || 0) - 35);

  return (
    <g>
      <foreignObject
        x={buttonX}
        y={buttonY}
        width="75"
        height="30"
        style={{ overflow: "visible" }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          onClick={handleDelete}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
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
          title="図形を削除"
        >
          🗑️ 削除
        </button>
      </foreignObject>
    </g>
  );
}
