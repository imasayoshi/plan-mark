import { useAnnotationUtils } from "../hooks/useAnnotationUtils";
import type { AnnotationActionsPropsType } from "../types/annotation";

export function AnnotationActions({
  selectedAnnotation,
  selectedTool,
  isEditing,
  onEdit,
  onDelete,
}: AnnotationActionsPropsType) {
  const { getPDFBounds } = useAnnotationUtils();

  if (!selectedAnnotation || isEditing || selectedTool !== null) {
    return null;
  }

  const handleEdit = () => {
    onEdit(selectedAnnotation);
  };

  const handleDelete = () => {
    onDelete(selectedAnnotation);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: Math.max(
          5,
          Math.min(selectedAnnotation.x! - 15, getPDFBounds().width - 160)
        ),
        top: Math.max(
          5,
          Math.min(selectedAnnotation.y! - 35, getPDFBounds().height - 30)
        ),
        zIndex: 20,
        display: "flex",
        gap: "4px",
      }}
    >
      <button
        onClick={handleEdit}
        style={{
          padding: "4px 8px",
          backgroundColor: "#10b981",
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
          e.currentTarget.style.backgroundColor = "#059669";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#10b981";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ✏️ 編集
      </button>
      <button
        onClick={handleDelete}
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
      >
        🗑️ 削除
      </button>
    </div>
  );
}
