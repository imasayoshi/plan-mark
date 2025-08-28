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
  onDelete?: () => void;
}

export interface EditPreviewPropsType {
  annotation: AnnotationType | null;
  content: string;
  onContentChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
}

export interface AnnotationLayerPropsType {
  documentId: string;
  pageNumber: number;
  selectedTool?: string | null;
  annotations: AnnotationType[];
  updateAnnotationOptimistic: (data: AnnotationUpdateType) => Promise<void>;
  createAnnotation: (
    data: AnnotationCreateType
  ) => Promise<AnnotationType | null>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  onStepChange?: (step: string, hasLeaderPoint: boolean) => void;
  onCollisionChange?: (hasCollisions: boolean, isManualMove?: boolean) => void;
}

export interface AnnotationCreatorPropsType {
  documentId: string;
  pageNumber: number;
  selectedTool?: string | null;
  isEditing: boolean;
  annotations: AnnotationType[];
  pendingCommentButton: { x: number; y: number } | null;
  onCreateAnnotation: (annotation: AnnotationType) => void;
  onSetPendingButton: (position: { x: number; y: number } | null) => void;
  onSetSelectedAnnotation: (annotation: AnnotationType | null) => void;
}

export interface AnnotationActionsPropsType {
  selectedAnnotation: AnnotationType | null;
  selectedTool?: string | null;
  isEditing: boolean;
  onEdit: (annotation: AnnotationType) => void;
  onDelete: (annotation: AnnotationType) => void;
}
