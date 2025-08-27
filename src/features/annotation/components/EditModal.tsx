import { useRef, useEffect } from "react";
import type { EditModalPropsType } from "../types/annotation";
import { useAnnotationUtils } from "../hooks/useAnnotationUtils";

export function EditModal({
  annotation,
  content,
  onContentChange,
  onCompositionStart,
  onCompositionEnd,
  onSave,
  onCancel,
  onDelete,
}: EditModalPropsType) {
  const { MAX_CHARS_PER_LINE } = useAnnotationUtils();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 編集モードの場合（annotation.idがある場合）、カーソルを最後に移動
  useEffect(() => {
    if (annotation?.id && textareaRef.current && content) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(content.length, content.length);
    }
  }, [annotation?.id, content]);

  if (!annotation) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          width: "350px",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "18px",
            color: "#333",
          }}
        >
          {annotation?.id ? "コメント編集" : "コメント入力"}
        </h3>

        <textarea
          ref={textareaRef}
          autoFocus={!annotation?.id} // 新規作成時のみautoFocus
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder="コメントを入力してください"
          style={{
            width: "310px",
            height: "150px",
            padding: "12px ",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "16px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: "1.5",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            fontSize: "12px",
            color: "#666",
            marginTop: "8px",
            textAlign: "right",
          }}
        >
          1行あたり最大{MAX_CHARS_PER_LINE}文字（超過時は自動改行）
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "20px",
            justifyContent: "space-between",
          }}
        >
          {/* 左側: 削除ボタン（編集時のみ表示） */}
          <div>
            {annotation?.id && onDelete && (
              <button
                onClick={onDelete}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
              >
                削除
              </button>
            )}
          </div>

          {/* 右側: キャンセル・保存ボタン */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onCancel}
              style={{
                padding: "10px 20px",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              キャンセル
            </button>
            <button
              onClick={onSave}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
