import { ARTICLES, EXAMPLES, GROUPS, INITIALS, KEYMAP, ZERO, articleItems } from "./data";

import { ROW_COURSES } from "./row-course";

export type PracticeType = "syllable" | "mapping";
export type Page = "practice" | "layout" | "random" | "mistakes" | "articles" | "shadow" | "rows";
export type Item = {
  id: string;
  answer: string;
  kind: PracticeType;
  han?: string;
  py?: string;
  prompt?: string;
  key?: string;
};
export type Mistake = Item & { misses: number; streak: number };
export type KeyRole = "initial" | "final" | "zero";
export type KeyStat = { key: string; role: KeyRole; attempts: number; errors: number };
export type KeyStats = Record<string, KeyStat>;
export type ProgressData = {
  attempts: number;
  correct: number;
  completed: string[];
  mistakes: Record<string, Mistake>;
  days: Record<string, number>;
  sessions: number;
  courseVersion: number;
  legacyCompleted?: string[];
  keyStats: KeyStats;
  articleCompletion: Record<string, Partial<Record<"articles" | "shadow" | "rows", true>>>;
};
export type Session = {
  items: Item[];
  index: number;
  input: string;
  attempts: number;
  correct: number;
  failed: boolean;
  error: string;
  paused: boolean;
  done: boolean;
  revealed: boolean;
  assisted: number;
  activeMs: number;
  lastAction: number;
  lastAnswer?: Item;
  mode: Page;
  group: string;
  type: PracticeType;
  articleId?: string;
};
export type State = { progress: ProgressData; session: Session | null };
export const STORAGE = "hexi-flypy-v1";
export const today = () => new Date().toLocaleDateString("en-CA");
export const freshProgress = (): ProgressData => ({
  attempts: 0,
  correct: 0,
  completed: [],
  mistakes: {},
  days: {},
  sessions: 0,
  courseVersion: 2,
  keyStats: {},
  articleCompletion: {},
});
export function loadProgress(): ProgressData {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (p && typeof p.attempts === "number" && p.days && p.mistakes && Array.isArray(p.completed)) {
      const result = { ...freshProgress(), ...p };
      if (p.courseVersion !== 2) {
        result.legacyCompleted = p.completed;
        result.completed = p.completed.filter((s: string) => s === "zero");
        result.courseVersion = 2;
      }
      return result;
    }
  } catch {
    /* Unavailable storage must not prevent practice. */
  }
  return freshProgress();
}
export function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function poolFor(group: (typeof GROUPS)[number], type: PracticeType): Item[] {
  if (group.id === "zero") return ZERO.map((x) => ({ ...x, kind: "syllable", id: "s:" + x.py }));
  const examples =
    group.id === "initial"
      ? Object.values(EXAMPLES)
          .flat()
          .filter((x) => x.answer[0] in INITIALS)
      : group.keys.split("").flatMap((k) => EXAMPLES[k]);
  if (type === "syllable" || group.id === "initial")
    return examples.map((x) => ({ ...x, kind: "syllable", id: "s:" + x.py }));
  return group.keys.split("").flatMap((key) =>
    KEYMAP[key].map((prompt) => ({
      prompt,
      answer: key,
      key,
      kind: "mapping" as const,
      id: "m:" + prompt,
    })),
  );
}
export function sequence(pool: Item[], count: number, balanced = false): Item[] {
  if (!pool.length) return [];
  const keys = [...new Set(pool.map((x) => x.key || ""))];
  const buckets = Object.fromEntries(
    keys.map((k) => [k, shuffle(pool.filter((x) => (x.key || "") === k))]),
  );
  const items: Item[] = [];
  while (items.length < count) {
    if (!balanced) {
      items.push(...shuffle(pool));
      continue;
    }
    for (const k of shuffle(keys)) {
      if (!buckets[k].length) buckets[k] = shuffle(pool.filter((x) => (x.key || "") === k));
      items.push(buckets[k].pop()!);
      if (items.length === count) break;
    }
  }
  return items.slice(0, count);
}
export function createSession(
  mode: Page,
  group = GROUPS[0].id,
  type: PracticeType = "syllable",
  mistakes: Mistake[] = [],
  articleId = ARTICLES[0].id,
  keyStats: KeyStats = {},
): Session {
  let items: Item[];
  if (mode === "articles" || mode === "shadow" || mode === "rows") {
    const pool =
      mode === "rows"
        ? (ROW_COURSES.find((row) => row.id === group) ?? ROW_COURSES[0]).sentences
        : ARTICLES;
    const article = pool.find((a) => a.id === articleId) ?? pool[0];
    articleId = article.id;
    items = articleItems(article).map((x) => ({
      ...x,
      kind: "syllable",
      id: "s:" + x.py,
    }));
  } else if (mode === "mistakes") items = sequence(mistakes, mistakes.length * 3);
  else if (mode === "random") {
    const pool = GROUPS.slice(0, 6).flatMap((g) => poolFor(g, type));
    if (type === "syllable") pool.push(...poolFor(GROUPS[7], type));
    items = type === "syllable" ? adaptiveSequence(pool, keyStats) : sequence(pool, 30);
  } else
    items = sequence(
      poolFor(
        GROUPS.find((g) => g.id === group)!,
        type,
      ),
      20,
      !["initial", "zero"].includes(group),
    );
  return {
    items,
    mode,
    group,
    type,
    articleId,
    index: 0,
    input: "",
    attempts: 0,
    correct: 0,
    failed: false,
    error: "",
    paused: false,
    done: false,
    revealed: false,
    assisted: 0,
    activeMs: 0,
    lastAction: 0,
  };
}
function keyRole(item: Item, index: number): KeyRole {
  if (item.kind === "mapping") return "final";
  if (/^[aoe]/.test(item.py || "")) return "zero";
  return index === 0 ? "initial" : "final";
}

export function rankedKeys(stats: KeyStats) {
  return Object.values(stats).sort(
    (a, b) => b.errors / (b.attempts + 5) - a.errors / (a.attempts + 5) || b.errors - a.errors,
  );
}

function matchesKey(item: Item, stat: KeyStat) {
  return item.answer
    .split("")
    .some((key, index) => key === stat.key && keyRole(item, index) === stat.role);
}

function adaptiveSequence(pool: Item[], stats: KeyStats) {
  const candidates = shuffle(pool);
  const targets = rankedKeys(stats)
    .filter((stat) => stat.errors >= 2 && stat.errors / stat.attempts >= 0.15)
    .filter((stat) => candidates.some((item) => matchesKey(item, stat)))
    .slice(0, 3);
  const items: Item[] = [];
  const seen = new Set<string>();
  const identity = (item: Item) => item.han || item.id;
  for (let i = 0; i < 12 && targets.length; i++) {
    const stat = targets[i % targets.length];
    const item = candidates.find((x) => !seen.has(identity(x)) && matchesKey(x, stat));
    if (item) {
      items.push(item);
      seen.add(identity(item));
    }
  }
  const remaining = candidates.filter((item) => !seen.has(identity(item)));
  for (const item of sequence(remaining, 30, true)) {
    if (items.length >= 30) break;
    if (seen.has(identity(item))) continue;
    items.push(item);
    seen.add(identity(item));
  }
  return shuffle(items);
}

function recordKeys(stats: KeyStats, item: Item, previous: string, value: string): KeyStats {
  if (value.length > item.answer.length || value === previous || !value) return stats;
  const updated = { ...stats };
  let index = 0;
  while (index < value.length && value[index] === previous[index]) index++;
  for (; index < value.length; index++) {
    const key = item.answer[index];
    const role = keyRole(item, index);
    const id = role + ":" + key;
    const old = updated[id];
    const wrong = value[index] !== key;
    updated[id] = {
      key,
      role,
      attempts: (old?.attempts ?? 0) + 1,
      errors: (old?.errors ?? 0) + Number(wrong),
    };
    if (wrong) break;
  }
  return updated;
}
export type Action =
  | { type: "start"; session: Session | null }
  | { type: "input"; value: string; now: number; day: string }
  | { type: "pause" }
  | { type: "reveal" }
  | { type: "tick"; now: number }
  | { type: "hint" };
export function reducer(state: State, action: Action): State {
  if (action.type === "start") return { ...state, session: action.session };
  if (!state.session) return state;
  const s = { ...state.session };
  if (action.type === "pause")
    return { ...state, session: { ...s, paused: !s.paused, lastAction: 0 } };
  if (action.type === "tick")
    return !s.paused && !s.done && s.lastAction && action.now - s.lastAction < 15000
      ? { ...state, session: { ...s, activeMs: s.activeMs + 1000 } }
      : state;
  if (action.type === "reveal" || action.type === "hint")
    return {
      ...state,
      session: { ...s, revealed: action.type === "reveal" || s.revealed, assisted: s.assisted + 1 },
    };
  if (s.paused || s.done) return state;
  if (/[^a-z]/i.test(action.value))
    return { ...state, session: { ...s, input: "", error: "请切换到英文输入法，输入字母。" } };
  const p = {
    ...state.progress,
    mistakes: { ...state.progress.mistakes },
    days: { ...state.progress.days },
    completed: [...state.progress.completed],
  };
  const item = s.items[s.index];
  const value = action.value.toLowerCase();
  if (!s.revealed) p.keyStats = recordKeys(p.keyStats, item, s.input, value);
  s.lastAction = action.now;
  s.input = value;
  s.error = "";
  if (!item.answer.startsWith(value)) {
    s.attempts++;
    p.attempts++;
    s.failed = true;
    s.input = "";
    s.error = "再试一次。已加入错题本。";
    p.mistakes[item.id] = { ...item, misses: (p.mistakes[item.id]?.misses || 0) + 1, streak: 0 };
  } else if (value === item.answer) {
    s.attempts++;
    s.correct++;
    p.attempts++;
    p.correct++;
    p.days[action.day] = (p.days[action.day] || 0) + 1;
    if (p.mistakes[item.id] && !s.failed && !s.revealed) {
      p.mistakes[item.id] = { ...p.mistakes[item.id], streak: p.mistakes[item.id].streak + 1 };
      if (p.mistakes[item.id].streak >= 3) delete p.mistakes[item.id];
    }
    s.lastAnswer = item;
    s.index++;
    s.input = "";
    s.failed = false;
    s.revealed = false;
    if (s.index === s.items.length) {
      s.done = true;
      p.sessions++;
      if (s.articleId && (s.mode === "articles" || s.mode === "shadow" || s.mode === "rows")) {
        const completed = p.articleCompletion?.[s.articleId];
        if (!completed?.[s.mode]) {
          p.articleCompletion = {
            ...p.articleCompletion,
            [s.articleId]: { ...completed, [s.mode]: true },
          };
        }
      }
      if (s.mode === "practice" && s.correct / s.attempts >= 0.9 && !s.assisted) {
        const tag = ["initial", "zero"].includes(s.group) ? s.group : s.group + ":" + s.type;
        if (!p.completed.includes(tag)) p.completed.push(tag);
      }
    }
  }
  return { progress: p, session: s };
}
export function sounds(item: Item) {
  const py = item.py || "";
  const initial = /^[aoe]/.test(py) ? "" : INITIALS[item.answer[0]] || py[0];
  return { initial, final: py.slice(initial.length) };
}
export function audioItem(item: Item | undefined) {
  if (!item) return null;
  if (item.kind === "syllable") return item;
  return (
    EXAMPLES[item.key || ""]?.find(
      (x) => sounds({ ...x, kind: "syllable", id: "" }).final === item.prompt,
    ) || null
  );
}
