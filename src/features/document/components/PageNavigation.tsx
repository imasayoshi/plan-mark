import type { PageNavigationPropsType } from "../types/document";

export function PageNavigation({
  pageNumber,
  numPages,
  onPageChange,
}: PageNavigationPropsType) {
  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pageNumber > 1) {
      onPageChange(pageNumber - 1);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pageNumber < numPages) {
      onPageChange(pageNumber + 1);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        minWidth: "200px",
        justifyContent: "flex-end",
      }}
    >
      <button
        onClick={handlePrevPage}
        disabled={pageNumber <= 1}
        style={{
          padding: "8px 16px",
          backgroundColor: pageNumber <= 1 ? "#f3f4f6" : "#3b82f6",
          color: pageNumber <= 1 ? "#9ca3af" : "white",
          border: "none",
          borderRadius: "4px",
          cursor: pageNumber <= 1 ? "not-allowed" : "pointer",
        }}
      >
        ← 前
      </button>
      <span style={{ fontWeight: "500", color: "#374151" }}>
        {pageNumber} / {numPages}
      </span>
      <button
        onClick={handleNextPage}
        disabled={pageNumber >= numPages}
        style={{
          padding: "8px 16px",
          backgroundColor: pageNumber >= numPages ? "#f3f4f6" : "#3b82f6",
          color: pageNumber >= numPages ? "#9ca3af" : "white",
          border: "none",
          borderRadius: "4px",
          cursor: pageNumber >= numPages ? "not-allowed" : "pointer",
        }}
      >
        次 →
      </button>
    </div>
  );
}
