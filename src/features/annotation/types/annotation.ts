export interface AnnotationType {
  id: string;
  documentId: string | null;
  pageNumber: number;
  content: string | null;
  x: number | null;
  y: number | null;
  leaderX?: number | null;
  leaderY?: number | null;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnotationCreateType {
  documentId: string;
  pageNumber: number;
  content: string;
  x: number;
  y: number;
  leaderX?: number;
  leaderY?: number;
  width?: number;
  height?: number;
}

export interface AnnotationUpdateType {
  id: string;
  content?: string;
  x?: number;
  y?: number;
  leaderX?: number;
  leaderY?: number;
  width?: number;
  height?: number;
}

export interface EditModalPropsType {
  annotation: AnnotationType | null;
  content: string;
  onContentChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface EditPreviewPropsType {
  annotation: AnnotationType | null;
  content: string;
  onContentChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
}
