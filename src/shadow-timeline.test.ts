import { expect, test } from "vite-plus/test";
import { recordStroke } from "./shadow-record";
import { buildTimeline, nearestError, paceAt } from "./shadow-timeline";

test("the chart uses completed Han characters in the recent window and recorded error times", () => {
  const current = [
    recordStroke(0, 0, "mw", "", "z")!,
    recordStroke(1000, 0, "mw", "", "mw")!,
    recordStroke(2100, 1, "tm", "", "z")!,
    recordStroke(5000, 1, "tm", "", "tm")!,
  ];
  const previous = [recordStroke(3200, 0, "mw", "", "mw")!];
  expect(paceAt(current, 0)).toBe(0);
  expect(paceAt(current, 1500)).toBe(40);
  expect(paceAt(current, 5000)).toBe(15);
  expect(paceAt(previous, 5000)).toBeNull();
  expect(nearestError(current, 2120, 100)?.key).toBe("Z");
  expect(nearestError(current, 2500, 100)).toBeUndefined();
  const plot = buildTimeline(current, previous);
  expect(plot.duration).toBe(5000);
  expect(plot.errors).toEqual([0, 2100]);
  expect(plot.previous.at(-1)?.at).toBe(3200);
  expect(plot.current.at(-1)).toEqual({ at: 5000, speed: 15 });
});
