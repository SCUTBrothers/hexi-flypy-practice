import { expect, test } from "vite-plus/test";
import { ARTICLES, EXAMPLES, GROUPS, KEYMAP, articleItems, encode } from "./data";
import {
  createSession,
  freshProgress,
  loadProgress,
  poolFor,
  reducer,
  sequence,
  STORAGE,
  type State,
} from "./practice";

const initial = (): State => ({ progress: freshProgress(), session: createSession("practice") });
const answer = (s: State, value = s.session!.items[s.session!.index].answer) =>
  reducer(s, { type: "input", value, now: 1000, day: "2026-11-22" });
test.each([
  ["qiu", "qq"],
  ["shuang", "ul"],
  ["zhong", "vs"],
  ["chun", "iy"],
  ["nü", "nv"],
  ["lüe", "lt"],
  ["xue", "xt"],
  ["qiong", "qs"],
  ["a", "aa"],
  ["o", "oo"],
  ["e", "ee"],
  ["ai", "ai"],
  ["an", "an"],
  ["ou", "ou"],
  ["er", "er"],
  ["ang", "ah"],
  ["eng", "eg"],
  ["guang", "gl"],
  ["kuai", "kk"],
  ["yuan", "yr"],
  ["yue", "yt"],
  ["yun", "yy"],
])("小鹤编码 %s → %s", (py, code) => expect(encode(py)).toBe(code));
test("eight courses cover every key and preserve balanced nonrepeating rounds", () => {
  expect(GROUPS).toHaveLength(8);
  expect(
    GROUPS.slice(0, 6)
      .map((g) => g.keys)
      .join(""),
  ).toBe("qwertyuiopasdfghjklzxcvbnm");
  for (const key of Object.keys(KEYMAP)) expect(EXAMPLES[key].length).toBeGreaterThanOrEqual(10);
  for (const group of GROUPS.slice(0, 6))
    for (let round = 0; round < 50; round++) {
      const items = sequence(poolFor(group, "syllable"), 20, true);
      expect(items).toHaveLength(20);
      expect(new Set(items.map((x) => x.han)).size).toBe(20);
      const counts = group.keys.split("").map((k) => items.filter((x) => x.key === k).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
});
test("article completion is tracked once per mode and only after the last character", () => {
  let state = initial();
  state.session = createSession("articles");
  state = answer(state);
  expect(state.progress.articleCompletion).toEqual({});
  while (!state.session!.done) state = answer(state);
  expect(state.progress.articleCompletion).toEqual({ daily: { articles: true } });
  state.session = createSession("shadow");
  while (!state.session!.done) state = answer(state);
  expect(state.progress.articleCompletion).toEqual({ daily: { articles: true, shadow: true } });
  const completed = state.progress.articleCompletion;
  state.session = createSession("shadow");
  while (!state.session!.done) state = answer(state);
  expect(state.progress.articleCompletion).toBe(completed);
});
test("every practice pool and article has a valid answer", () => {
  expect(Object.values(EXAMPLES).flat().length).toBeGreaterThanOrEqual(1000);
  expect(new Set(ARTICLES.map((article) => article.id)).size).toBe(ARTICLES.length);
  expect(ARTICLES.length).toBeGreaterThanOrEqual(60);
  for (const group of GROUPS)
    for (const type of ["mapping", "syllable"] as const)
      expect(poolFor(group, type).every((x) => /^[a-z]{1,2}$/.test(x.answer))).toBe(true);
  for (const article of ARTICLES) {
    expect(articleItems(article), article.title).toHaveLength(
      article.text.split("").filter((c) => /[\u3400-\u9fff]/.test(c)).length,
    );
    expect(
      articleItems(article).filter((x) => !/^[a-z]{2}$/.test(x.answer)),
      article.title,
    ).toEqual([]);
    expect(
      createSession("articles", undefined, "syllable", [], article.id)
        .items.map((x) => x.han)
        .join(""),
    ).toBe(article.text.replace(/[^\u3400-\u9fff]/g, ""));
  }
});
test("key errors are charged to the expected letter and its position", () => {
  const item = { id: "s:qiu", kind: "syllable" as const, han: "秋", py: "qiu", answer: "qq" };
  let state = initial();
  state.session!.items = [item, item];
  state = answer(state, "q");
  state = answer(state, "qw");
  state = answer(state, "w");
  state = answer(state, "qq");
  expect(state.progress.keyStats).toEqual({
    "initial:q": { key: "q", role: "initial", attempts: 3, errors: 1 },
    "final:q": { key: "q", role: "final", attempts: 2, errors: 1 },
  });
  state = reducer(state, { type: "reveal" });
  const recorded = state.progress.keyStats;
  state = answer(state, "w");
  state = answer(state, "qq");
  expect(state.progress.keyStats).toBe(recorded);
});
test("random spelling trains weak positions using different characters and reduces focus as they improve", () => {
  const weak = { "final:q": { key: "q", role: "final" as const, attempts: 8, errors: 6 } };
  const strong = { "final:q": { ...weak["final:q"], attempts: 100 } };
  const nextRound = (stats: typeof weak) =>
    createSession("random", undefined, "syllable", [], undefined, stats).items;
  const focused = nextRound(weak);
  expect(focused).toHaveLength(30);
  expect(new Set(focused.map((item) => item.han)).size).toBe(30);
  expect(focused.filter((item) => item.answer[1] === "q").length).toBeGreaterThanOrEqual(12);
  expect(nextRound(strong).filter((item) => item.answer[1] === "q").length).toBeLessThan(12);
});
test("prefix waits for second key; errors are tracked; correction is not a clean streak", () => {
  let state = initial();
  const item = state.session!.items[0];
  state = answer(state, item.answer[0]);
  expect(state.session!.index).toBe(0);
  expect(state.progress.attempts).toBe(0);
  state = answer(state, "zzzz");
  expect(state.progress.mistakes[item.id].misses).toBe(1);
  state = answer(state);
  expect(state.session!.index).toBe(1);
  expect(state.progress.days["2026-11-22"]).toBe(1);
  expect(state.progress.mistakes[item.id].streak).toBe(0);
  state = reducer(state, {
    type: "start",
    session: { ...createSession("mistakes"), items: [item, item, item] },
  });
  state = answer(state);
  state = answer(state);
  expect(state.progress.mistakes[item.id].streak).toBe(2);
  state = answer(state);
  expect(state.progress.mistakes[item.id]).toBeUndefined();
});
test("independent pass lights the course, revealed or low accuracy rounds do not", () => {
  for (const condition of ["clean", "hint", "reveal", "error"]) {
    let state = initial();
    if (condition === "hint" || condition === "reveal") state = reducer(state, { type: condition });
    if (condition === "error") for (let i = 0; i < 5; i++) state = answer(state, "zzzz");
    while (!state.session!.done) state = answer(state);
    expect(state.progress.completed.includes("top-qwert:syllable")).toBe(condition === "clean");
    expect(state.progress.sessions).toBe(1);
  }
});
test("pause rejects input and inactivity excludes idle time", () => {
  let state = initial();
  state = reducer(state, { type: "pause" });
  const paused = state;
  expect(answer(state)).toBe(paused);
  state = reducer(state, { type: "pause" });
  state = answer(state, state.session!.items[0].answer[0]);
  state = reducer(state, { type: "tick", now: 2000 });
  expect(state.session!.activeMs).toBe(1000);
  state = reducer(state, { type: "tick", now: 17000 });
  expect(state.session!.activeMs).toBe(1000);
});
test("old progress and course history migrate without losing mistakes or counts", () => {
  localStorage.setItem(
    STORAGE,
    JSON.stringify({
      attempts: 24,
      correct: 20,
      sessions: 2,
      mistakes: {},
      completed: ["q", "zero"],
      courseVersion: 1,
      days: { yesterday: 20 },
    }),
  );
  expect(loadProgress()).toMatchObject({
    attempts: 24,
    correct: 20,
    completed: ["zero"],
    legacyCompleted: ["q", "zero"],
    days: { yesterday: 20 },
    courseVersion: 2,
    keyStats: {},
    articleCompletion: {},
  });
  localStorage.setItem(STORAGE, "{broken");
  expect(loadProgress()).toEqual(freshProgress());
});
