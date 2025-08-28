import type { PolygonRendererPropsType } from "../types/shape";

export function PolygonRenderer({
  polygonPoints,
  selectedTool,
}: PolygonRendererPropsType) {
  if (polygonPoints.length === 0 || selectedTool !== "polygon") {
    return null;
  }

  return (
    <g>
      {/* 確定した点を表示 */}
      {polygonPoints.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#ef4444"
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* 点をつなぐ線を表示 */}
      {polygonPoints.length > 1 && (
        <polyline
          points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="4,2"
        />
      )}

      {/* 最初と最後の点を結ぶ線（プレビュー） */}
      {polygonPoints.length >= 3 && (
        <line
          x1={polygonPoints[polygonPoints.length - 1].x}
          y1={polygonPoints[polygonPoints.length - 1].y}
          x2={polygonPoints[0].x}
          y2={polygonPoints[0].y}
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.6"
        />
      )}
    </g>
  );
}
