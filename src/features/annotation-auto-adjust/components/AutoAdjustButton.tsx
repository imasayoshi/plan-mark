import type { AutoAdjustButtonPropsType } from "../types/auto-adjust";

export function AutoAdjustButton({
  onClick,
  isAdjusting,
  hasCollisions,
}: AutoAdjustButtonPropsType) {
  return (
    <button
      onClick={onClick}
      disabled={isAdjusting}
      title={
        isAdjusting
          ? "調整中..."
          : hasCollisions
            ? "コメントボックスの重なりを自動調整"
            : "重なりは検出されていません"
      }
      style={{
        padding: "8px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        backgroundColor: hasCollisions ? "#fff7ed" : "white",
        color: hasCollisions ? "#ea580c" : "#6b7280",
        cursor: isAdjusting
          ? "not-allowed"
          : hasCollisions
            ? "pointer"
            : "default",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        minHeight: "40px",
        transition: "all 0.2s",
        fontWeight: hasCollisions ? "500" : "normal",
        opacity: isAdjusting ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isAdjusting && hasCollisions) {
          e.currentTarget.style.backgroundColor = "#fed7aa";
          e.currentTarget.style.borderColor = "#ea580c";
        }
      }}
      onMouseLeave={(e) => {
        if (!isAdjusting) {
          e.currentTarget.style.backgroundColor = hasCollisions
            ? "#fff7ed"
            : "white";
          e.currentTarget.style.borderColor = "#d1d5db";
        }
      }}
    >
      {isAdjusting ? (
        <>
          <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
          調整中...
        </>
      ) : (
        <>
          🔧 自動調整
          {hasCollisions && (
            <span
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                borderRadius: "50%",
                width: "6px",
                height: "6px",
                display: "inline-block",
                marginLeft: "2px",
              }}
            />
          )}
        </>
      )}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
}
