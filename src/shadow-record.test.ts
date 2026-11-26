import { expect, test } from "vite-plus/test";
import { getResult, loadShadow, recordStroke, saveShadow, strokeAt } from "./shadow-record";

test("a replay keeps key order, mistakes, corrections, and pauses", () => {
  const strokes = [
    recordStroke(0, 0, "mw", "", "m")!,
    recordStroke(200, 0, "mw", "m", "mz")!,
    recordStroke(520, 0, "mw", "", "m")!,
    recordStroke(550, 0, "mw", "m", "")!,
    recordStroke(970, 0, "mw", "", "mw")!,
  ];
  expect(strokeAt(strokes, -1)).toBeUndefined();
  expect(strokeAt(strokes, 200)).toMatchObject({ index: 0, offset: 0, key: "Z", errors: 1 });
  expect(strokeAt(strokes, 519)).toBe(strokes[1]);
  expect(strokeAt(strokes, 520)).toMatchObject({ index: 0, offset: 1, key: "M" });
  expect(strokeAt(strokes, 560)).toMatchObject({ key: "⌫", keys: 0 });
  expect(strokeAt(strokes, 970)).toMatchObject({ index: 1, offset: 0, key: "MW" });
  expect(getResult(strokes)).toMatchObject({
    characters: 1,
    elapsed: 970,
    keys: 5,
    errors: 1,
    accuracy: 80,
  });
  expect(recordStroke(1020, 1, "tm", "", "汉字")).toBeNull();
  expect(saveShadow("daily", { signature: "old text", strokes })).toBe(true);
  expect(loadShadow("daily", "old text")?.strokes).toEqual(strokes);
  expect(loadShadow("daily", "edited text")).toBeNull();
  expect(loadShadow("spring", "old text")).toBeNull();
});
