import { expect, test } from "vite-plus/test";
import {
  buildPassageLayout,
  caretPointForPosition,
  interpolatePacePoint,
  rowShiftForGlyph,
  viewportHeightForRows,
} from "./shadow-motion";

const sampleBoxes = [
  // Row 0 (top 0)
  { index: 0, left: 4, top: 0, width: 32, height: 56 },
  { index: 1, left: 38, top: 1, width: 32, height: 56 },
  // Row 1 (top 58)
  { index: 2, left: 4, top: 58, width: 32, height: 56 },
  { index: 3, left: 38, top: 58, width: 32, height: 56 },
  // Row 2 (top 116)
  { index: 4, left: 4, top: 116, width: 32, height: 56 },
  // Row 3 (top 174)
  { index: 5, left: 4, top: 174, width: 32, height: 56 },
];

test("buildPassageLayout groups sub-pixel rows and computes exact 3-line viewport and shifts", () => {
  const layout = buildPassageLayout(sampleBoxes);
  expect(layout.rowTops).toEqual([0, 58, 116, 174]);
  expect(layout.rowHeight).toBe(58);
  expect(viewportHeightForRows(layout, 3)).toBe(174);
  expect(rowShiftForGlyph(layout, 0)).toBe(0);
  expect(rowShiftForGlyph(layout, 2)).toBe(0);
  expect(rowShiftForGlyph(layout, 4)).toBe(58);
  expect(rowShiftForGlyph(layout, 5)).toBe(116);
});

test("caretPointForPosition and interpolatePacePoint compute smooth horizontal coordinates", () => {
  const layout = buildPassageLayout(sampleBoxes);
  expect(caretPointForPosition(layout, 0, 0)).toEqual({ x: 3, y: 28, row: 0 });
  expect(caretPointForPosition(layout, 0, 1)).toEqual({ x: 20, y: 28, row: 0 });
  expect(interpolatePacePoint(layout, 0.25)).toEqual({ x: 12, y: 28, row: 0 });
  expect(interpolatePacePoint(layout, 2.5)).toEqual({ x: 20, y: 86, row: 1 });
  expect(interpolatePacePoint(layout, 99)).toEqual({ x: 36, y: 202, row: 3 });
});
