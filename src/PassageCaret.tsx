import { useLayoutEffect, useRef } from "react";

function alignCaret(mark: HTMLElement) {
  const glyph = mark.parentElement?.querySelector<HTMLElement>(
    `[data-glyph="${mark.dataset.index}"]`,
  );
  if (!glyph) return;
  const x = glyph.offsetLeft + (glyph.offsetWidth * Number(mark.dataset.offset)) / 2;
  const y = glyph.offsetTop + glyph.offsetHeight / 2;
  // On line wrap, move directly to the next line instead of sweeping across the passage.
  mark.style.transitionDuration = mark.dataset.row === String(y) ? "" : "0s";
  mark.style.transform = `translate(${x}px, ${y}px) translateY(-50%)`;
  mark.dataset.row = String(y);
}

export function PassageCaret({
  index,
  offset,
  ghost = false,
}: {
  index: number;
  offset: number;
  ghost?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (ref.current) alignCaret(ref.current);
  }, [index, offset]);
  useLayoutEffect(() => {
    const mark = ref.current;
    if (!mark?.parentElement) return;
    const observer = new ResizeObserver(() => alignCaret(mark));
    observer.observe(mark.parentElement);
    return () => observer.disconnect();
  }, []);
  return (
    <i
      ref={ref}
      data-index={index}
      data-offset={offset}
      className={ghost ? "passage-caret ghost-caret" : "passage-caret"}
      aria-hidden="true"
    />
  );
}
