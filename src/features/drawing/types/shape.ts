export type ShapeType = "rectangle" | "circle" | "arrow" | "polygon";

export interface BaseShape {
  id: string;
  documentId: string;
  pageNumber: number;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RectangleShape extends BaseShape {
  type: "rectangle";
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  radius: number;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  endX: number;
  endY: number;
}

export interface PolygonShape extends BaseShape {
  type: "polygon";
  points: Array<{ x: number; y: number }>;
}

export type Shape = RectangleShape | CircleShape | ArrowShape | PolygonShape;

export interface ShapeCreateType {
  documentId: string;
  pageNumber: number;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  points?: Array<{ x: number; y: number }>;
  color?: string;
  strokeWidth?: number;
}

export interface ShapeUpdateType {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  points?: Array<{ x: number; y: number }>;
  color?: string;
  strokeWidth?: number;
}

export interface DrawingLayerPropsType {
  documentId: string;
  pageNumber: number;
  selectedTool: ShapeType | null;
  onShapeCreated?: (shape: Shape) => void;
  onPolygonStateChange?: (points: Array<{ x: number; y: number }>) => void;
  polygonCompleteRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  polygonCancelRef?: React.MutableRefObject<(() => void) | null>;
}

export interface ShapeComponentPropsType {
  shape: Shape;
  isSelected?: boolean;
  onSelect?: (shape: Shape) => void;
  onMove?: (shape: Shape, deltaX: number, deltaY: number) => void;
  onMoveEnd?: (shape: Shape, deltaX: number, deltaY: number) => void;
}

export interface ShapeActionsPropsType {
  selectedShape: Shape | null;
  onDelete: (shape: Shape) => void;
}

export interface PolygonRendererPropsType {
  polygonPoints: Array<{ x: number; y: number }>;
  selectedTool: ShapeType | null;
}
