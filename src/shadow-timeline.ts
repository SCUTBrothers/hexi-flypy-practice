import { strokeAt, type Stroke } from "./shadow-record";

const paceWindow = 4000;

export function paceAt(strokes: Stroke[], time: number): number | null {
  const finish = strokes.at(-1)?.at ?? 0;
  if (time > finish || !strokes.length) return null;
  if (time <= 0) return 0;
  const from = Math.max(0, time - paceWindow);
  const completed = strokeAt(strokes, time)?.index ?? 0;
  const before = from ? (strokeAt(strokes, from)?.index ?? 0) : 0;
  return Math.round(((completed - before) * 60000) / (time - from));
}

export function buildTimeline(current: Stroke[], previous?: Stroke[]) {
  const duration = Math.max(current.at(-1)?.at ?? 0, previous?.at(-1)?.at ?? 0, 1);
  const step = Math.max(200, Math.ceil(duration / 55));
  function points(strokes: Stroke[]) {
    const end = strokes.at(-1)?.at ?? 0;
    const samples = [];
    for (let at = 0; at < end; at += step) {
      samples.push({ at, speed: paceAt(strokes, at) ?? 0 });
    }
    samples.push({ at: end, speed: paceAt(strokes, end) ?? 0 });
    return samples;
  }
  const now = points(current);
  const last = previous?.length ? points(previous) : [];
  const peak = [current, previous ?? []].reduce(
    (maximum, strokes) =>
      strokes.reduce(
        (highest, stroke) => Math.max(highest, paceAt(strokes, stroke.at) ?? 0),
        maximum,
      ),
    0,
  );
  return {
    duration,
    maxSpeed: Math.max(30, Math.ceil(peak / 30) * 30),
    current: now,
    previous: last,
    errors: current.filter((stroke) => stroke.errors > 0).map((stroke) => stroke.at),
  };
}

export function nearestError(strokes: Stroke[], at: number, tolerance: number) {
  let match: Stroke | undefined;
  let distance = tolerance;
  for (const stroke of strokes) {
    const delta = Math.abs(stroke.at - at);
    if (stroke.errors && delta <= distance) {
      distance = delta;
      match = stroke;
    }
  }
  return match;
}
