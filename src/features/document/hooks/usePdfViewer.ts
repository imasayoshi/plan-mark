import { useState, useEffect } from "react";
import { documentService } from "../services/documentService";
import type { DocumentType } from "../types/document";

export function usePdfViewer(document: DocumentType) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfDocumentLoaded, setIsPdfDocumentLoaded] = useState(false);
  const [isPdfPageLoaded, setIsPdfPageLoaded] = useState(false);

  // PDF読み込み完了フラグ（ドキュメントとページの両方が読み込まれた状態）
  const isPdfFullyLoaded = isPdfDocumentLoaded && isPdfPageLoaded;

  // ドキュメント変更時にPDF読み込み状態を完全にリセット
  useEffect(() => {
    setIsPdfDocumentLoaded(false);
    setIsPdfPageLoaded(false);
    setPdfUrl(null); // PDFのURLもクリアして前のPDFが表示されないようにする
    setIsLoading(true); // ローディング状態に戻す
    setError(null); // エラー状態もクリア
  }, [document.id]);

  useEffect(() => {
    loadDocument();
  }, [document.fileKey]);

  const loadDocument = async () => {
    if (!document.fileKey) {
      setError("ファイルキーが見つかりません");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = await documentService.getDocumentUrl(document.fileKey);
      setPdfUrl(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load document";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsPdfDocumentLoaded(true);
    setIsPdfPageLoaded(false); // ページ読み込みはまだ
  };

  const onPageLoadSuccess = () => {
    setIsPdfPageLoaded(true);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError(`PDF読み込みエラー: ${error.message}`);
    setIsPdfDocumentLoaded(false);
    setIsPdfPageLoaded(false);
  };

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    setIsPdfPageLoaded(false); // ページ変更時にリセット
  };

  return {
    pdfUrl,
    isLoading,
    error,
    numPages,
    pageNumber,
    isPdfFullyLoaded,
    onDocumentLoadSuccess,
    onPageLoadSuccess,
    onDocumentLoadError,
    handlePageChange,
  };
}
