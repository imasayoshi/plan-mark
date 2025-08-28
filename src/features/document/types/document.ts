export interface DocumentType {
  id: string;
  name: string | null;
  fileKey: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentUploadType {
  name: string;
  file: File;
}

export interface DocumentUploaderPropsType {
  onUploadSuccess: (document: DocumentType) => void;
}

export type ToolType =
  | "annotation"
  | "rectangle"
  | "circle"
  | "arrow"
  | "polygon";

export interface DocumentViewerPropsType {
  document: DocumentType;
  selectedTool?: string | null;
  onToolChange?: (tool: ToolType | null) => void;
}

export interface DocumentManagementPropsType {
  onDocumentSelect: (document: DocumentType | null) => void;
}

export interface PdfDisplayPropsType {
  document: DocumentType;
  pdfUrl: string;
  pageNumber: number;
  isPdfFullyLoaded: boolean;
  selectedTool: ToolType | null;
  polygonCompleteRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
  polygonCancelRef: React.MutableRefObject<(() => void) | null>;
  annotations: any[];
  updateAnnotationOptimistic: (data: any) => Promise<void>;
  createAnnotation: (data: any) => Promise<any>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  onDocumentLoadSuccess: (data: { numPages: number }) => void;
  onDocumentLoadError: (error: Error) => void;
  onPageLoadSuccess: () => void;
  onPolygonStateChange: (points: Array<{ x: number; y: number }>) => void;
  onCollisionChange: (hasCollisions: boolean, isManualMove?: boolean) => void;
}

export interface DocumentToolbarPropsType {
  selectedTool: ToolType | null;
  polygonPoints: Array<{ x: number; y: number }>;
  isAdjusting: boolean;
  hasCollisions: boolean;
  pageNumber: number;
  numPages: number;
  onToolChange: (tool: ToolType | null) => void;
  onPolygonComplete: () => void;
  onPolygonCancel: () => void;
  onAutoAdjust: () => void;
  onPageChange: (page: number) => void;
}

export interface PageNavigationPropsType {
  pageNumber: number;
  numPages: number;
  onPageChange: (page: number) => void;
}
