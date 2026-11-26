export type Stroke = {
  at: number;
  index: number;
  offset: number;
  key: string;
  errors: number;
  keys: number;
};

export type ShadowRecord = {
  signature: string;
  strokes: Stroke[];
};

export function recordStroke(
  at: number,
  index: number,
  code: string,
  before: string,
  value: string,
): Stroke | null {
  if (value === before || !/^[a-z]{0,2}$/.test(value)) return null;
  let start = 0;
  while (start < value.length && value[start] === before[start]) start++;
  const pressed = value.slice(start);
  const wrong = !code.startsWith(value);
  let keys = 0;
  for (const [i, key] of pressed.split("").entries()) {
    keys++;
    if (code[start + i] !== key) break;
  }
  return {
    at,
    index: index + Number(value === code),
    offset: wrong || value === code ? 0 : value.length,
    key: pressed ? pressed.toUpperCase() : "⌫",
    errors: Number(wrong),
    keys,
  };
}

export function strokeAt(strokes: Stroke[], time: number): Stroke | undefined {
  let low = 0;
  let high = strokes.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (strokes[mid].at <= time) low = mid + 1;
    else high = mid;
  }
  return strokes[low - 1];
}

export function getResult(strokes: Stroke[]) {
  const last = strokes.at(-1);
  const elapsed = last?.at ?? 0;
  const characters = last?.index ?? 0;
  const keys = strokes.reduce((sum, stroke) => sum + stroke.keys, 0);
  const errors = strokes.reduce((sum, stroke) => sum + stroke.errors, 0);
  return {
    elapsed,
    characters,
    speed: elapsed ? Math.round((characters * 60000) / elapsed) : 0,
    accuracy: keys ? ((keys - errors) / keys) * 100 : 0,
    keys,
    errors,
  };
}

const storageKey = (articleId: string) => "hexi-shadow-v1:" + articleId;
export function loadShadow(articleId: string, signature: string): ShadowRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(articleId)) || "null");
    if (value?.signature === signature && Array.isArray(value.strokes) && value.strokes.length)
      return value;
  } catch {
    return null;
  }
  return null;
}

export function saveShadow(articleId: string, record: ShadowRecord): boolean {
  try {
    localStorage.setItem(storageKey(articleId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
