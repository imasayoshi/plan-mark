import { useCallback } from "react";

export const useAnnotationUtils = () => {
  const calculateLineBoxIntersection = useCallback(
    (
      leaderX: number,
      leaderY: number,
      boxX: number,
      boxY: number,
      boxWidth: number,
      boxHeight: number
    ) => {
      const boxCenterX = boxX + boxWidth / 2;
      const boxCenterY = boxY + boxHeight / 2;

      const dx = boxCenterX - leaderX;
      const dy = boxCenterY - leaderY;

      if (dx === 0 && dy === 0) {
        return { x: boxCenterX, y: boxCenterY };
      }

      const intersections: Array<{ x: number; y: number; distance: number }> =
        [];

      if (dy !== 0) {
        const t = (boxY - leaderY) / dy;
        const x = leaderX + t * dx;
        if (t > 0 && x >= boxX && x <= boxX + boxWidth) {
          intersections.push({ x, y: boxY, distance: t });
        }
      }

      if (dy !== 0) {
        const t = (boxY + boxHeight - leaderY) / dy;
        const x = leaderX + t * dx;
        if (t > 0 && x >= boxX && x <= boxX + boxWidth) {
          intersections.push({ x, y: boxY + boxHeight, distance: t });
        }
      }

      if (dx !== 0) {
        const t = (boxX - leaderX) / dx;
        const y = leaderY + t * dy;
        if (t > 0 && y >= boxY && y <= boxY + boxHeight) {
          intersections.push({ x: boxX, y, distance: t });
        }
      }

      if (dx !== 0) {
        const t = (boxX + boxWidth - leaderX) / dx;
        const y = leaderY + t * dy;
        if (t > 0 && y >= boxY && y <= boxY + boxHeight) {
          intersections.push({ x: boxX + boxWidth, y, distance: t });
        }
      }

      if (intersections.length > 0) {
        const closest = intersections.reduce((min, current) =>
          current.distance < min.distance ? current : min
        );
        return { x: closest.x, y: closest.y };
      }

      return { x: boxCenterX, y: boxCenterY };
    },
    []
  );

  const getPDFBounds = useCallback(() => {
    const pdfCanvas = document.querySelector(
      ".react-pdf__Page__canvas"
    ) as HTMLCanvasElement;
    if (pdfCanvas) {
      return {
        width: pdfCanvas.width / (window.devicePixelRatio || 1),
        height: pdfCanvas.height / (window.devicePixelRatio || 1),
      };
    }
    return { width: 800, height: 600 };
  }, []);

  const calculateOptimalCommentPosition = useCallback(
    (leaderX: number, leaderY: number) => {
      const bounds = getPDFBounds();
      const commentBoxWidth = 150;
      const commentBoxHeight = 40;
      const margin = 10;

      const distanceToTop = leaderY;
      const distanceToBottom = bounds.height - leaderY;
      const distanceToLeft = leaderX;
      const distanceToRight = bounds.width - leaderX;

      const minDistance = Math.min(
        distanceToTop,
        distanceToBottom,
        distanceToLeft,
        distanceToRight
      );

      let commentX: number;
      let commentY: number;

      if (minDistance === distanceToTop) {
        commentX = Math.max(
          margin,
          Math.min(
            leaderX - commentBoxWidth / 2,
            bounds.width - commentBoxWidth - margin
          )
        );
        commentY = margin;
      } else if (minDistance === distanceToBottom) {
        commentX = Math.max(
          margin,
          Math.min(
            leaderX - commentBoxWidth / 2,
            bounds.width - commentBoxWidth - margin
          )
        );
        commentY = bounds.height - commentBoxHeight - margin;
      } else if (minDistance === distanceToLeft) {
        commentX = margin;
        commentY = Math.max(
          margin,
          Math.min(
            leaderY - commentBoxHeight / 2,
            bounds.height - commentBoxHeight - margin
          )
        );
      } else {
        commentX = bounds.width - commentBoxWidth - margin;
        commentY = Math.max(
          margin,
          Math.min(
            leaderY - commentBoxHeight / 2,
            bounds.height - commentBoxHeight - margin
          )
        );
      }

      return { x: commentX, y: commentY };
    },
    [getPDFBounds]
  );

  const calculateTextareaSize = useCallback((content: string) => {
    const displayContent = content || "あ";
    const lines = displayContent.split("\n");
    const lineCount = Math.max(lines.length, 1);

    const baseCharWidth = 7.0; // 半角文字幅を設定
    const zenkakuRatio = 1.4; // 全角は半角の1.4倍
    const lineHeight = 16; // 11px * 1.3 + 余裕
    const paddingSpace = 18;

    console.log("calculateTextareaSize - input:", {
      content: displayContent,
      lines: lines,
      lineCount: lineCount,
    });

    const maxLineWidth = Math.max(
      ...lines.map((line) => {
        if (!line) return baseCharWidth * 3;

        let totalWidth = 0;
        for (let i = 0; i < line.length; i++) {
          const char = line.charCodeAt(i);
          const isZenkaku = char > 255;
          const charWidth = isZenkaku
            ? baseCharWidth * zenkakuRatio
            : baseCharWidth;
          totalWidth += charWidth;

          console.log(
            `char: "${line[i]}" (${char}) - isZenkaku: ${isZenkaku}, width: ${charWidth}`
          );
        }

        console.log(`line: "${line}" - totalWidth: ${totalWidth}`);
        return totalWidth;
      })
    );

    const pdfWidth = Math.max(maxLineWidth + paddingSpace, 26);
    const pdfHeight = Math.max(lineCount * lineHeight + 12, 28);

    console.log("calculateTextareaSize - result:", {
      maxLineWidth,
      pdfWidth,
      pdfHeight,
      finalSize: { width: Math.ceil(pdfWidth), height: Math.ceil(pdfHeight) },
    });

    return {
      width: Math.ceil(pdfWidth),
      height: Math.ceil(pdfHeight),
    };
  }, []);

  const MAX_CHARS_PER_LINE = 20;

  const applyAutoLineBreaks = useCallback((value: string) => {
    const lines = value.split("\n");
    const processedLines: string[] = [];

    for (const line of lines) {
      if (line.length <= MAX_CHARS_PER_LINE) {
        processedLines.push(line);
      } else {
        let remainingText = line;
        while (remainingText.length > MAX_CHARS_PER_LINE) {
          processedLines.push(remainingText.substring(0, MAX_CHARS_PER_LINE));
          remainingText = remainingText.substring(MAX_CHARS_PER_LINE);
        }
        if (remainingText.length > 0) {
          processedLines.push(remainingText);
        }
      }
    }

    return processedLines.join("\n");
  }, []);

  return {
    calculateLineBoxIntersection,
    getPDFBounds,
    calculateOptimalCommentPosition,
    calculateTextareaSize,
    applyAutoLineBreaks,
    MAX_CHARS_PER_LINE,
  };
};
