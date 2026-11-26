import { useEffect, useLayoutEffect, useRef } from "react";

function alignCaret(mark: HTMLElement, snap: boolean) {
  const glyph = mark.parentElement?.querySelector<HTMLElement>(
    `[data-glyph="${mark.dataset.index}"]`,
  );
  if (!glyph) return;
  const offset = Number(mark.dataset.offset) || 0;
  const x =
    offset === 0 ? glyph.offsetLeft - 1 : glyph.offsetLeft + (glyph.offsetWidth * offset) / 2;
  const y = glyph.offsetTop + glyph.offsetHeight / 2;
  const sameRow = !snap && mark.dataset.row === String(y);
  // Snap on line wraps or passage switches so the caret never sweeps diagonally across lines.
  mark.style.transitionDuration = sameRow ? "" : "0s";
  mark.style.transform = `translate3d(${x}px, ${y}px, 0) translateY(-50%)`;
  mark.dataset.row = String(y);
}

export function PassageCaret({
  index,
  offset,
  ghost = false,
  typing = false,
  error = false,
  resetKey,
}: {
  index: number;
  offset: number;
  ghost?: boolean;
  typing?: boolean;
  error?: boolean;
  resetKey?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const previousReset = useRef(resetKey);

  useLayoutEffect(() => {
    const mark = ref.current;
    if (!mark) return;
    const snap = previousReset.current !== resetKey;
    previousReset.current = resetKey;
    alignCaret(mark, snap);
  }, [index, offset, resetKey]);

  useLayoutEffect(() => {
    const mark = ref.current;
    const container = mark?.parentElement;
    if (!mark || !container) return;
    const observer = new ResizeObserver(() => alignCaret(mark, true));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mark = ref.current;
    if (!mark || typeof document === "undefined" || !("fonts" in document)) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active && ref.current) alignCaret(ref.current, true);
    });
    return () => {
      active = false;
    };
  }, [resetKey]);

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
