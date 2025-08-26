import type { EditPreviewPropsType } from "../types/annotation";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";

export function EditPreview({
  annotation,
  content,
  onContentChange,
  onCompositionStart,
  onCompositionEnd,
}: EditPreviewPropsType) {
  const { calculateLineBoxIntersection, calculateTextareaSize } =
    useAnnotationUtils();

  if (!annotation) return null;

  const currentSize = calculateTextareaSize(content);

  const intersection = calculateLineBoxIntersection(
    annotation.leaderX!,
    annotation.leaderY!,
    annotation.x!,
    annotation.y!,
    currentSize.width,
    currentSize.height
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 8,
        }}
      >
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <line
            x1={annotation.leaderX!}
            y1={annotation.leaderY!}
            x2={intersection.x}
            y2={intersection.y}
            stroke="#ff9800"
            strokeWidth="1.5"
          />
          <circle
            cx={annotation.leaderX!}
            cy={annotation.leaderY!}
            r="2"
            fill="#ff9800"
          />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          left: annotation.x || 0,
          top: annotation.y || 0,
          zIndex: 15,
        }}
      >
        <textarea
          value={content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder=""
          style={{
            width: currentSize.width,
            height: currentSize.height,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "2px solid #ff9800",
            borderRadius: "8px",
            padding: "6px",
            fontSize: "11px",
            lineHeight: "1.3",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            zIndex: 10,
            overflow: "hidden",
            boxSizing: "border-box",
            color: "#333",
          }}
        />
      </div>
    </>
  );
}
