export type RawGlyphBox = {
  readonly index: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type GlyphBox = RawGlyphBox & {
  readonly row: number;
};

export type EndBox = {
  readonly left: number;
  readonly top: number;
  readonly height: number;
};

export type PassageLayout = {
  readonly boxes: readonly GlyphBox[];
  readonly rowTops: readonly number[];
  readonly rowHeight: number;
  readonly endBox?: EndBox;
};

export type CaretPoint = {
  readonly x: number;
  readonly y: number;
  readonly row: number;
};

const ROW_TOLERANCE_PX = 4;

export function buildPassageLayout(
  rawBoxes: readonly RawGlyphBox[],
  endBox?: EndBox,
): PassageLayout {
  const rowTops: number[] = [];
  const boxes: GlyphBox[] = [];

  for (const box of rawBoxes) {
    let row = rowTops.findIndex((top) => Math.abs(box.top - top) <= ROW_TOLERANCE_PX);
    if (row === -1) {
      row = rowTops.length;
      rowTops.push(box.top);
    }
    boxes.push({ ...box, row });
  }

  let rowHeight = rawBoxes[0]?.height ?? 0;
  if (rowTops.length >= 2) {
    let totalDiff = 0;
    for (let i = 1; i < rowTops.length; i++) {
      totalDiff += rowTops[i] - rowTops[i - 1];
    }
    rowHeight = Math.round(totalDiff / (rowTops.length - 1));
  }

  return { boxes, rowTops, rowHeight, endBox };
}

export function measurePassageLayout(container: HTMLElement): PassageLayout {
  const nodes = container.querySelectorAll<HTMLElement>("[data-glyph]");
  const rawBoxes: RawGlyphBox[] = [];
  let endBox: EndBox | undefined;

  for (const node of nodes) {
    const index = Number(node.dataset.glyph);
    if (Number.isNaN(index)) continue;
    if (node.classList.contains("shadow-end")) {
      endBox = {
        left: node.offsetLeft,
        top: node.offsetTop,
        height: node.offsetHeight,
      };
      continue;
    }
    rawBoxes.push({
      index,
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
    });
  }

  rawBoxes.sort((a, b) => a.index - b.index);
  return buildPassageLayout(rawBoxes, endBox);
}

export function rowShiftForGlyph(layout: PassageLayout, glyphIndex: number): number {
  if (layout.rowTops.length <= 2) return 0;
  const clamped = Math.max(0, Math.min(glyphIndex, layout.boxes.length - 1));
  const box = layout.boxes[clamped];
  if (!box || box.row < 2) return 0;
  return Math.max(0, layout.rowTops[box.row - 1] - layout.rowTops[0]);
}

export function viewportHeightForRows(layout: PassageLayout, visibleRows = 3): number | null {
  if (!layout.rowHeight || layout.rowHeight <= 0) return null;
  return Math.round(layout.rowHeight * visibleRows);
}

export function caretPointForPosition(
  layout: PassageLayout,
  index: number,
  offset: number,
): CaretPoint | null {
  if (index >= layout.boxes.length) {
    const last = layout.boxes.at(-1);
    if (layout.endBox) {
      return {
        x: layout.endBox.left,
        y: layout.endBox.top + layout.endBox.height / 2,
        row: Math.max(0, layout.rowTops.length - 1),
      };
    }
    if (!last) return null;
    return {
      x: last.left + last.width,
      y: last.top + last.height / 2,
      row: last.row,
    };
  }

  const box = layout.boxes[Math.max(0, index)];
  if (!box) return null;
  const x = offset <= 0 ? box.left - 1 : box.left + (box.width * offset) / 2;
  return {
    x,
    y: box.top + box.height / 2,
    row: box.row,
  };
}

export function interpolatePacePoint(
  layout: PassageLayout,
  progressChars: number,
): CaretPoint | null {
  if (!layout.boxes.length) return null;
  const clamped = Math.max(0, Math.min(progressChars, layout.boxes.length));
  if (clamped >= layout.boxes.length) {
    const last = layout.boxes.at(-1)!;
    return {
      x: last.left + last.width,
      y: last.top + last.height / 2,
      row: last.row,
    };
  }
  const idx = Math.floor(clamped);
  const fraction = clamped - idx;
  const box = layout.boxes[idx];
  return {
    x: box.left + box.width * fraction,
    y: box.top + box.height / 2,
    row: box.row,
  };
}

export function applyCaretTransform(mark: HTMLElement, point: CaretPoint, snap: boolean) {
  const rowKey = String(point.row);
  const sameRow = !snap && mark.dataset.row === rowKey;
  mark.style.transitionDuration = sameRow ? "" : "0s";
  mark.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translateY(-50%)`;
  mark.dataset.row = rowKey;
}
