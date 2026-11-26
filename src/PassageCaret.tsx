import { useEffect, useLayoutEffect, useRef } from "react";
import { applyCaretTransform, caretPointForPosition, type PassageLayout } from "./shadow-motion";

function alignCaretFromDom(mark: HTMLElement, snap: boolean) {
  const glyph = mark.parentElement?.querySelector<HTMLElement>(
    `[data-glyph="${mark.dataset.index}"]`,
  );
  if (!glyph) return;
  const offset = Number(mark.dataset.offset) || 0;
  const x =
    offset === 0 ? glyph.offsetLeft - 1 : glyph.offsetLeft + (glyph.offsetWidth * offset) / 2;
  const y = glyph.offsetTop + glyph.offsetHeight / 2;
  const rowKey = String(Math.round(glyph.offsetTop));
  const sameRow = !snap && mark.dataset.row === rowKey;
  // Snap on line wraps or passage switches so the caret never sweeps diagonally across lines.
  mark.style.transitionDuration = sameRow ? "" : "0s";
  mark.style.transform = `translate3d(${x}px, ${y}px, 0) translateY(-50%)`;
  mark.dataset.row = rowKey;
}

export function PassageCaret({
  index,
  offset,
  ghost = false,
  typing = false,
  error = false,
  resetKey,
  layout,
}: {
  index: number;
  offset: number;
  ghost?: boolean;
  typing?: boolean;
  error?: boolean;
  resetKey?: string;
  layout?: PassageLayout | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const previousReset = useRef(resetKey);

  useLayoutEffect(() => {
    const mark = ref.current;
    if (!mark) return;
    const snap = previousReset.current !== resetKey;
    previousReset.current = resetKey;
    if (layout && layout.boxes.length > 0) {
      const point = caretPointForPosition(layout, index, offset);
      if (point) {
        applyCaretTransform(mark, point, snap);
        return;
      }
    }
    alignCaretFromDom(mark, snap);
  }, [index, offset, resetKey, layout]);

  useLayoutEffect(() => {
    if (layout) return;
    const mark = ref.current;
    const container = mark?.parentElement;
    if (!mark || !container) return;
    const observer = new ResizeObserver(() => alignCaretFromDom(mark, true));
    observer.observe(container);
    return () => observer.disconnect();
  }, [layout]);

  useEffect(() => {
    if (layout) return;
    const mark = ref.current;
    if (!mark || typeof document === "undefined" || !("fonts" in document)) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active && ref.current) alignCaretFromDom(ref.current, true);
    });
    return () => {
      active = false;
    };
  }, [resetKey, layout]);

  return (
    <i
      ref={ref}
      data-index={index}
      data-offset={offset}
      data-half={offset > 0 ? "true" : undefined}
      data-typing={typing ? "true" : undefined}
      data-error={error ? "true" : undefined}
      className={ghost ? "passage-caret ghost-caret" : "passage-caret"}
      aria-hidden="true"
    />
  );
}
