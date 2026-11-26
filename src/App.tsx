import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import {
  Dialog,
  DialogTrigger,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@ui-sdk/react/dialog";
import { Progress, ProgressTrack, ProgressIndicator } from "@ui-sdk/react/progress";
import { Badge } from "@/components/reui/badge";
import { ARTICLES, EXAMPLES, GROUPS, INITIALS, KEYMAP } from "./data";
import {
  STORAGE,
  audioItem,
  createSession,
  loadProgress,
  rankedKeys,
  reducer,
  sounds,
  today,
  type Item,
  type KeyRole,
  type Page,
  type PracticeType,
} from "./practice";
import { SpeechCoach } from "./speech";
import { ShadowPractice } from "./ShadowPractice";
import { ROW_COURSES, type RowCourse } from "./row-course";

const pages: Record<Page, { label: string; icon: string; title: string; description: string }> = {
  practice: {
    label: "进阶练习",
    icon: "grid",
    title: "每一次敲击，都更熟悉一点。",
    description: "按组记忆，用汉字串起声母与韵母。慢慢来，每天进步一点。",
  },
  rows: {
    label: "盲打课程",
    icon: "keyboard",
    title: "按键盘行练双拼",
    description: "食指轻放在 F、J 的凸点上。每句至少七成按键落在目标行，标点自动跳过。",
  },
  layout: {
    label: "键位速查",
    icon: "keyboard",
    title: "把每一个音，放回键盘。",
    description: "先认识，再记住。点击键位查看韵母、声母和例字。",
  },
  random: {
    label: "随机练习",
    icon: "shuffle",
    title: "让熟悉的键，自然出现。",
    description: "打乱顺序，在变化里检验你的记忆。每轮 30 题。",
  },
  mistakes: {
    label: "错题本",
    icon: "book",
    title: "把不熟悉，练成熟悉。",
    description: "错误会自动收集；同一道题连续独立答对 3 次，就会移出错题本。",
  },
  articles: {
    label: "文章练习",
    icon: "text",
    title: "在文字之间，找到节奏。",
    description: "从一个音到一句话。逐字输入双拼，标点自动跳过。",
  },
  shadow: {
    label: "影子跟打",
    icon: "text",
    title: "跟着上一次的自己打",
    description: "直接在原文上练双拼。重打同一篇时，红色光标会跟随上一次的按键节奏。",
  },
};
const keyRoleLabels: Record<KeyRole, string> = { initial: "声母", final: "韵母", zero: "零声母" };
const articleCategories = [...new Set(ARTICLES.map((article) => article.tag))];
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    keyboard: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8" />
      </>
    ),
    shuffle: (
      <>
        <path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4" />
      </>
    ),
    book: (
      <>
        <path d="M5 3h14v18H6a3 3 0 0 1 0-6h13M5 3v12M9 7h6M9 10h4" />
      </>
    ),
    text: (
      <>
        <path d="M5 4h14M12 4v16M9 20h6M5 4v3M19 4v3" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    leaf: (
      <>
        <path d="M20 3C7 2 2 8 5 15c7 5 15-1 15-12ZM5 20 16 8" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1" />
      </>
    ),
  };
  return (
    <svg
      className={"icon " + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.leaf}
    </svg>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
  disabledValues = [],
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  disabledValues?: string[];
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      className="choice"
    >
      {options.map(([v, name]) => (
        <SegmentedControlItem key={v} value={v} disabled={disabledValues.includes(v)}>
          {name}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
function Setting({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-600">
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled}>
        <SwitchThumb />
      </Switch>
      {label}
    </label>
  );
}
function Bar({ value, label }: { value: number; label: string }) {
  return (
    <Progress value={value} aria-label={label} className="w-full min-w-0">
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  );
}
function Keyboard({
  selected = "",
  active = "",
  onKey,
}: {
  selected?: string;
  active?: string;
  onKey: (k: string) => void;
}) {
  return (
    <div className="keyboard" aria-label="小鹤双拼键位图">
      {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => (
        <div key={row} className="keyboard-row">
          {row.split("").map((k) => (
            <Button
              key={k}
              className="keycap"
              data-selected={selected.includes(k) || undefined}
              data-active={active === k || undefined}
              onClick={() => onKey(k)}
              aria-label={`${k.toUpperCase()} 键，韵母 ${KEYMAP[k].join("、")}${INITIALS[k] ? "，声母 " + INITIALS[k] : ""}`}
            >
              <span className="key-letter">{k.toUpperCase()}</span>
              {INITIALS[k] && <span className="key-initial">{INITIALS[k]}</span>}
              <span className="key-final">{KEYMAP[k].join(" · ")}</span>
            </Button>
          ))}
        </div>
      ))}
      <div className="space-key">小鹤双拼 · 两键一音</div>
    </div>
  );
}
function Answer({ item }: { item: Item }) {
  return (
    <div className="answer-review">
      <span>上一题</span>
      <strong>{item.han || item.prompt}</strong>
      <span>{item.py}</span>
      <kbd>{item.answer.toUpperCase().split("").join(" + ")}</kbd>
      {item.py && (
        <span className="hidden sm:inline">
          {sounds(item).initial ? `声母 ${sounds(item).initial} · ` : "零声母 · "}
          {sounds(item).final}
        </span>
      )}
    </div>
  );
}
function readAudioSettings(): { autoRead: boolean; rate: number } {
  try {
    const p = JSON.parse(localStorage.getItem("hexi-audio-v1") || "null");
    return { autoRead: !!p?.autoRead, rate: [0.65, 0.8, 1].includes(p?.rate) ? p.rate : 0.8 };
  } catch {
    return { autoRead: false, rate: 0.8 };
  }
}
function readDisplayHint(key: "soundHints" | "pinyinHints"): boolean {
  try {
    return JSON.parse(localStorage.getItem("hexi-display-v1") || "null")?.[key] !== false;
  } catch {
    return true;
  }
}
export default function App() {
  const [page, setPage] = useState<Page>("practice");
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [practiceType, setPracticeType] = useState<PracticeType>("syllable");
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    progress: loadProgress(),
    session: createSession("practice"),
  }));
  const { progress, session } = state;
  const articleCompletion = progress.articleCompletion ?? {};
  const articleCount = ARTICLES.filter((article) => {
    const flags = articleCompletion[article.id];
    return flags?.articles || flags?.shadow;
  }).length;
  const shadowCompleted = new Set(
    ARTICLES.filter((article) => articleCompletion[article.id]?.shadow).map(
      (article) => article.id,
    ),
  );
  const rowCompleted = new Set(
    Object.keys(articleCompletion).filter((id) => articleCompletion[id]?.rows),
  );
  const activeCourse = ROW_COURSES.find((row) => row.id === session?.group) ?? ROW_COURSES[0];
  const [hints, setHints] = useState(false);
  const [soundHints, setSoundHints] = useState(() => readDisplayHint("soundHints"));
  const [pinyinHints, setPinyinHints] = useState(() => readDisplayHint("pinyinHints"));
  const [listenOnly, setListenOnly] = useState(false);
  const [audioSettings, setAudioSettings] = useState(readAudioSettings);
  const [unlocked, setUnlocked] = useState(false);
  const [voice, setVoice] = useState(SpeechCoach.snapshot);
  const [selectedKey, setSelectedKey] = useState("q");
  const [saveError, setSaveError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [articleCategory, setArticleCategory] = useState("全部");
  const [shadowArticleId, setShadowArticleId] = useState(ARTICLES[0].id);
  const [shadowRound, setShadowRound] = useState(0);
  const [showAllKeyStats, setShowAllKeyStats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const { autoRead, rate } = audioSettings;
  const current = session?.items[session.index];
  const hidden = listenOnly && current?.kind === "syllable" && !session?.revealed;
  const group = GROUPS.find((g) => g.id === groupId)!;
  const mistakes = Object.values(progress.mistakes);
  const keyStats = page === "mistakes" ? rankedKeys(progress.keyStats) : [];
  const day = progress.days[today()] || 0;
  const accuracy = session?.attempts ? Math.round((session.correct / session.attempts) * 100) : 0;
  const isDone = (id: string) =>
    progress.completed.includes(["initial", "zero"].includes(id) ? id : id + ":syllable");
  const mastered = GROUPS.filter((g) => isDone(g.id)).length;
  useEffect(() => {
    const unsubscribe = SpeechCoach.subscribe(setVoice);
    return () => {
      unsubscribe();
      SpeechCoach.stop();
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(progress));
    } catch {
      setSaveError("当前浏览器无法保存进度，本次仍可继续练习。");
    }
  }, [progress]);
  useEffect(() => {
    try {
      localStorage.setItem("hexi-audio-v1", JSON.stringify(audioSettings));
    } catch {
      /* Audio preferences are optional when storage is unavailable. */
    }
  }, [audioSettings]);
  useEffect(() => {
    try {
      localStorage.setItem("hexi-display-v1", JSON.stringify({ soundHints, pinyinHints }));
    } catch {
      /* Practice remains usable when the browser blocks saving preferences. */
    }
  }, [soundHints, pinyinHints]);
  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session?.paused) inputRef.current?.focus({ preventScroll: true });
  }, [session?.items, session?.paused]);
  useEffect(() => {
    if (
      unlocked &&
      autoRead &&
      session &&
      session.mode !== "shadow" &&
      !session.paused &&
      !session.done &&
      !helpOpen
    )
      SpeechCoach.speak(audioItem(session.items[session.index]), rate);
    return () => SpeechCoach.stop();
  }, [
    unlocked,
    autoRead,
    rate,
    session?.items,
    session?.mode,
    session?.index,
    session?.paused,
    session?.done,
    helpOpen,
  ]);
  function start(mode: Page, id = groupId, type = practiceType, articleId?: string) {
    SpeechCoach.stop();
    setHints(false);
    dispatch({
      type: "start",
      session: createSession(mode, id, type, mistakes, articleId, progress.keyStats),
    });
  }
  function startShadow(articleId = shadowArticleId) {
    setPage("shadow");
    location.hash = "shadow";
    setShadowArticleId(articleId);
    setShadowRound((round) => round + 1);
    start("shadow", groupId, "syllable", articleId);
  }
  function startRow(course: RowCourse, sentenceId?: string) {
    const unpractised = course.sentences.filter((sentence) => !rowCompleted.has(sentence.id));
    const pool = unpractised.length ? unpractised : course.sentences;
    const id = sentenceId ?? pool[Math.floor(Math.random() * pool.length)].id;
    setShadowRound((round) => round + 1);
    start("rows", course.id, "syllable", id);
  }
  function navigate(next: Page) {
    if (next === "shadow") {
      startShadow();
      return;
    }
    SpeechCoach.stop();
    setPage(next);
    location.hash = next;
    if (next === "practice") start("practice");
    else if (next === "rows") startRow(ROW_COURSES[0]);
    else dispatch({ type: "start", session: null });
  }
  function chooseGroup(id: string) {
    setGroupId(id);
    setPracticeType("syllable");
    start("practice", id, "syllable");
  }
  function submit(value: string) {
    if (composing.current) return;
    if (hints && session && !session.revealed) dispatch({ type: "reveal" });
    dispatch({ type: "input", value, now: Date.now(), day: today() });
  }
  function play() {
    if (session && !session.done && !session.paused) {
      setUnlocked(true);
      if (unlocked || !autoRead) SpeechCoach.speak(audioItem(current), rate);
    }
  }
  function switchListening(value: string) {
    if (value === "listen") {
      if (!voice.available) return;
      setHints(false);
      setListenOnly(true);
      setUnlocked(true);
      setAudioSettings((s) => ({ ...s, autoRead: true }));
      if (autoRead && unlocked) SpeechCoach.speak(audioItem(current), rate);
    } else {
      setListenOnly(false);
      SpeechCoach.stop();
    }
  }
  function nextRound() {
    if (page === "practice") {
      if (practiceType === "mapping") {
        setPracticeType("syllable");
        start(page, groupId, "syllable");
      } else
        chooseGroup(GROUPS[(GROUPS.findIndex((g) => g.id === groupId) + 1) % GROUPS.length].id);
    } else {
      SpeechCoach.stop();
      dispatch({ type: "start", session: null });
    }
  }
  const practicePanel = session && page !== "shadow" && page !== "rows" && (
    <>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5 sm:px-7">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {page === "practice" ? "专项练习" : pages[page].label}
            </Badge>
            <h2 className="text-base font-semibold">
              {page === "practice"
                ? group.label
                : page === "articles"
                  ? ARTICLES.find((a) => a.id === session.articleId)?.title
                  : pages[page].label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {page !== "practice" && (
              <Button
                data-variant="ghost"
                onClick={() => {
                  SpeechCoach.stop();
                  dispatch({ type: "start", session: null });
                }}
              >
                返回列表
              </Button>
            )}
            <Button
              data-variant="ghost"
              className="text-sm"
              onClick={() => start(page, groupId, practiceType, session.articleId)}
            >
              重新开始
            </Button>
          </div>
        </div>
        {page !== "practice" && !session.done && (
          <div className="px-5 pt-5 sm:px-7">
            <Setting
              label="答案提示"
              checked={hints}
              disabled={listenOnly}
              onChange={(v) => {
                setHints(v);
                if (v) dispatch({ type: "hint" });
              }}
            />
          </div>
        )}
        {page === "practice" && (
          <div className="px-5 pt-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!["initial", "zero"].includes(groupId) && (
                <Choice
                  label="练习类型"
                  value={practiceType}
                  options={[
                    ["syllable", "汉字拼写"],
                    ["mapping", "韵母热身"],
                  ]}
                  onChange={(v) => {
                    setPracticeType(v as PracticeType);
                    start("practice", groupId, v as PracticeType);
                  }}
                />
              )}
              <Setting
                label="答案提示"
                checked={hints}
                disabled={listenOnly}
                onChange={(v) => {
                  setHints(v);
                  if (v) dispatch({ type: "hint" });
                }}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {group.keys.split("").map((k) => (
                <div className="group-key" key={k}>
                  <kbd>{k.toUpperCase()}</kbd>
                  <span>{groupId === "initial" ? INITIALS[k] : KEYMAP[k].join(" / ")}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-6 text-stone-500">
              {["zero", "initial"].includes(groupId)
                ? group.description
                : "每轮 20 题，均衡覆盖组内韵母键；声母不限。"}
            </p>
          </div>
        )}
        {session.done ? (
          <div className="result px-6 py-12 text-center">
            <div className="result-seal">✓</div>
            <p className="eyebrow mt-5">本轮练习完成</p>
            <h2 className="mt-3 text-2xl font-semibold">又熟悉了一点。</h2>
            <p className="mt-3 text-stone-600">
              完成 {session.items.length} 题 · 正确率 {accuracy}% · 错误尝试{" "}
              {session.attempts - session.correct} 次
            </p>
            {session.lastAnswer && <Answer item={session.lastAnswer} />}
            <p className="mt-5 text-sm text-stone-500">
              {session.assisted
                ? "本轮使用了提示；独立完成且正确率达到 90% 可点亮分组。"
                : "每一次重复，都让记忆更牢固。"}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => start(page, groupId, practiceType, session.articleId)}>
                再练一轮
              </Button>
              <Button data-variant="solid" onClick={nextRound}>
                {page === "practice" ? "继续下一步" : "返回练习列表"}
                <Icon name="arrow" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="audio-toolbar mx-5 mt-5 sm:mx-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon name="sound" />
                  听见，也记住
                </div>
                <Choice
                  label="题目呈现"
                  disabledValues={voice.available ? [] : ["listen"]}
                  value={listenOnly ? "listen" : "look"}
                  options={[
                    ["look", "看字练习"],
                    ["listen", "听音练习"],
                  ]}
                  onChange={switchListening}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  onClick={play}
                  disabled={!voice.available || session.paused}
                  className="h-8"
                >
                  <Icon name="sound" />
                  重听
                </Button>
                <Choice
                  label="朗读速度"
                  value={String(rate)}
                  options={[
                    ["0.65", "慢速"],
                    ["0.8", "适中"],
                    ["1", "正常"],
                  ]}
                  onChange={(v) => setAudioSettings((s) => ({ ...s, rate: Number(v) }))}
                />
                <Setting
                  label="自动朗读"
                  checked={autoRead}
                  disabled={!voice.available}
                  onChange={(v) => {
                    setUnlocked(true);
                    setAudioSettings((s) => ({ ...s, autoRead: v }));
                  }}
                />
              </div>
              <p aria-live="polite" className="mt-2 text-xs leading-5 text-stone-600">
                {voice.message}
                {!voice.available && (
                  <Button data-variant="ghost" onClick={() => SpeechCoach.refresh()}>
                    重新检测
                  </Button>
                )}
              </p>
            </div>
            <div className="question-area px-5 py-7 text-center sm:px-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
                <span>
                  本轮进度{" "}
                  <strong className="ml-2 text-stone-700">
                    {session.index + 1} / {session.items.length}
                  </strong>
                </span>
                {current?.kind === "syllable" && (
                  <div className="flex flex-wrap items-center gap-4">
                    <Setting label="拼音提示" checked={pinyinHints} onChange={setPinyinHints} />
                    <Setting label="声韵母提示" checked={soundHints} onChange={setSoundHints} />
                  </div>
                )}
                <Button
                  data-variant="ghost"
                  onClick={() => {
                    dispatch({ type: "pause" });
                    SpeechCoach.stop();
                  }}
                  className="h-7"
                >
                  {session.paused ? "继续练习" : "暂停练习"}
                </Button>
              </div>
              <Bar label="本轮完成进度" value={(session.index / session.items.length) * 100} />
              {page === "articles" && (
                <p className="article-line">
                  {session.items.map((item, index) => (
                    <span
                      key={`${item.id}-${index}`}
                      data-current={index === session.index || undefined}
                      data-finished={index < session.index || undefined}
                    >
                      {listenOnly && index >= session.index ? "·" : item.han}
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-8 min-h-34">
                {session.paused ? (
                  <>
                    <div className="question-word text-4xl">稍作休息</div>
                    <p className="mt-5 text-sm text-stone-500">准备好了，再继续。</p>
                  </>
                ) : hidden ? (
                  <>
                    <div className="listening-orb">
                      <Icon name="sound" />
                    </div>
                    <p className="mt-4 text-sm text-stone-600">听一听，输入这个音的双拼</p>
                  </>
                ) : (
                  <>
                    <div className="question-word" data-testid="question">
                      {current?.han || current?.prompt}
                    </div>
                    {current?.py && pinyinHints && (
                      <p
                        className="mt-2 font-mono text-xl tracking-widest text-stone-600"
                        data-testid="pinyin"
                      >
                        {current?.py}
                      </p>
                    )}
                    {current?.py && soundHints && (
                      <p className="mt-3 text-xs text-stone-500" data-testid="sound-hints">
                        {sounds(current).initial ? (
                          <>
                            声母 <b>{sounds(current).initial}</b>
                            <span className="mx-3 text-stone-300">/</span>韵母{" "}
                            <b>{sounds(current).final}</b>
                          </>
                        ) : (
                          `零声母音节 ${current.py}`
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
              <Field className="mx-auto mt-6 max-w-64">
                <FieldLabel className="sr-only">双拼输入</FieldLabel>
                <Input
                  ref={inputRef}
                  value={session.input}
                  onValueChange={submit}
                  disabled={session.paused}
                  onCompositionStart={() => {
                    composing.current = true;
                  }}
                  onCompositionEnd={() => {
                    composing.current = false;
                    submit("中文");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === " " && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      play();
                    }
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={current?.kind === "mapping" ? "输入韵母键" : "输入两位字母"}
                  className="typing-input"
                />
              </Field>
              <div className="mt-3 min-h-7 text-sm" aria-live="polite">
                {session.error ? (
                  <span className="text-red-700">{session.error}</span>
                ) : hints && !hidden ? (
                  <span className="text-emerald-800">
                    正确按键：{current?.answer.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-stone-500">英文输入法 · 空格重听 · 输入后自动继续</span>
                )}
              </div>
              {hidden && (
                <Button
                  data-variant="ghost"
                  className="mt-1 text-xs"
                  onClick={() => dispatch({ type: "reveal" })}
                >
                  查看题目提示
                </Button>
              )}
              {session.lastAnswer && <Answer item={session.lastAnswer} />}
            </div>
            <div className="session-stats">
              <div>
                <span>正确率</span>
                <strong>{session.attempts ? accuracy + "%" : "—"}</strong>
              </div>
              <div>
                <span>已完成</span>
                <strong>
                  {session.index}
                  <small> 题</small>
                </strong>
              </div>
              <div>
                <span>输入速度</span>
                <strong>
                  {session.activeMs > 1000
                    ? Math.round(session.index / (session.activeMs / 60000))
                    : "—"}
                  <small> 题/分</small>
                </strong>
              </div>
            </div>
          </>
        )}
      </section>
      <section className="panel mt-5 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">让手指记住位置</h3>
          <p className="text-xs text-stone-500">
            <span className="text-emerald-800">●</span> 本组韵母{" "}
            <span className="ml-3 text-amber-800">●</span> 复合声母
          </p>
        </div>
        <Keyboard
          selected={page === "practice" ? group.keys : ""}
          active={hints && !hidden && !session.done ? current?.answer[session.input.length] : ""}
          onKey={(k) => {
            submit(session.input + k);
            inputRef.current?.focus({ preventScroll: true });
          }}
        />
        <p className="mt-4 text-center text-xs text-stone-500">第一键声母 · 第二键韵母</p>
      </section>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#practice"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("practice");
          }}
        >
          <span className="brand-mark">
            <Icon name="leaf" />
          </span>
          <span>
            鹤习<small>小鹤双拼练习</small>
          </span>
        </a>
        <p className="nav-caption">每天一点，慢慢熟练</p>
        <nav aria-label="主要导航">
          {(Object.keys(pages) as Page[]).map((p) => (
            <Button
              key={p}
              onClick={() => navigate(p)}
              className="nav-button"
              aria-current={page === p ? "page" : undefined}
            >
              <Icon name={pages[p].icon} />
              <span>{pages[p].label}</span>
              {p === "mistakes" && mistakes.length > 0 && (
                <span className="count">{mistakes.length}</span>
              )}
              {p === "practice" && <span className="nav-dot" />}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Icon name="leaf" />
          <p>
            不必着急，
            <br />
            熟悉是重复的礼物。
          </p>
          <div>小鹤双拼 · FLYPY</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="topbar">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>我的学习空间</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-800">{pages[page].label}</span>
          </div>
          <Dialog
            open={helpOpen}
            onOpenChange={(v) => {
              setHelpOpen(v);
              if (v) SpeechCoach.stop();
            }}
          >
            <DialogTrigger className="help-trigger">
              练习指南 <span aria-hidden="true">↗</span>
            </DialogTrigger>
            <DialogBackdrop />
            <DialogContent className="help-dialog">
              <DialogTitle>练习指南</DialogTitle>
              <DialogDescription>先听音、拆拼音，再回想韵母所在的键。</DialogDescription>
              <ol className="my-5 list-decimal space-y-3 pl-5 text-sm leading-7">
                <li>切换到英文输入法。每个汉字输入两位字母，答对自动进入下一题。</li>
                <li>按组熟悉韵母键，再试随机练习和文章。组内声母不限。</li>
                <li>听音模式隐藏题目；空格可以重听，查看提示后本轮不会点亮分组。</li>
                <li>错题连续独立答对三次自动移出。进度保存在当前浏览器，换设备不会自动同步。</li>
                <li>朗读使用设备的普通话语音；如果没有中文语音，仍可进行看字练习。</li>
              </ol>
              <DialogClose data-variant="solid">知道了，开始练习</DialogClose>
            </DialogContent>
          </Dialog>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">一点一点，练成习惯</p>
              <h1>{pages[page].title}</h1>
              <p className="mt-3 text-sm leading-7 text-stone-500">{pages[page].description}</p>
            </div>
            <div className="scheme-label">
              <span>当前方案</span>
              <strong>
                小鹤双拼 <small>FLYPY</small>
              </strong>
            </div>
          </div>
          {saveError && (
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {saveError}
            </p>
          )}
          {page === "practice" && (
            <div className="course-grid">
              {GROUPS.map((g, i) => (
                <Button
                  key={g.id}
                  onClick={() => chooseGroup(g.id)}
                  className="course-card"
                  aria-current={groupId === g.id ? "step" : undefined}
                >
                  <span className="course-number">
                    {isDone(g.id) ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{g.label}</strong>
                    <small>
                      {g.id === "initial"
                        ? "SH · CH · ZH"
                        : g.keys.split("").join(" ").toUpperCase()}
                    </small>
                  </span>
                </Button>
              ))}
            </div>
          )}
          {page === "rows" && session?.mode === "rows" && (
            <>
              <div className="mb-5 grid gap-2 sm:grid-cols-3" aria-label="盲打课程键位行">
                {ROW_COURSES.map((row) => (
                  <Button
                    key={row.id}
                    className="course-card row-course-card"
                    aria-pressed={row.id === activeCourse.id}
                    aria-current={row.id === activeCourse.id ? "step" : undefined}
                    onClick={() => startRow(row)}
                  >
                    <span>
                      <strong>{row.label}</strong>
                      <small>{row.keys.toUpperCase().split("").join(" ")}</small>
                      <small>
                        已练 {row.sentences.filter((s) => rowCompleted.has(s.id)).length} /{" "}
                        {row.sentences.length} 句
                      </small>
                    </span>
                  </Button>
                ))}
              </div>
              <ShadowPractice
                key={shadowRound}
                course={activeCourse}
                article={activeCourse.sentences.find((s) => s.id === session.articleId)!}
                session={session}
                completed={rowCompleted}
                pinyinHints={pinyinHints}
                onInput={submit}
                onArticle={(id) => startRow(activeCourse, id)}
                onRestart={() => startRow(activeCourse, session.articleId)}
              />
            </>
          )}
          {page === "shadow" && session?.mode === "shadow" && (
            <>
              <div className="panel mb-5 p-4 sm:p-5">
                <p className="mb-2 text-sm">
                  影子跟打进度{" "}
                  <strong>
                    已练习 {shadowCompleted.size} / {ARTICLES.length} 篇
                  </strong>
                </p>
                <Bar
                  value={(shadowCompleted.size / ARTICLES.length) * 100}
                  label="影子跟打完成度"
                />
              </div>
              <ShadowPractice
                key={shadowRound}
                article={ARTICLES.find((article) => article.id === shadowArticleId)!}
                session={session}
                completed={shadowCompleted}
                pinyinHints={pinyinHints}
                onInput={submit}
                onArticle={startShadow}
                onRestart={() => startShadow()}
              />
            </>
          )}
          {session && page !== "shadow" && page !== "rows" && (
            <div className="practice-grid">
              <div className="min-w-0">{practicePanel}</div>
              <aside className="right-rail">
                <section className="panel p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">今天，也进步一点</h3>
                    <Icon name="sun" className="text-amber-700" />
                  </div>
                  <div className="daily-total">
                    <strong>{day}</strong>
                    <span>/ 50 题</span>
                  </div>
                  <Bar value={Math.min(100, day * 2)} label="今日目标" />
                  <p className="mt-3 text-center text-xs text-stone-500">每日小目标</p>
                  <dl className="mt-7 space-y-4 border-t border-stone-100 pt-5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-stone-500">累计练习</dt>
                      <dd className="font-semibold">{progress.attempts} 次</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-stone-500">总正确率</dt>
                      <dd className="font-semibold">
                        {progress.attempts
                          ? Math.round((progress.correct / progress.attempts) * 100) + "%"
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="tip-card">
                  <Icon name="leaf" />
                  <h3 className="mt-4 font-semibold">双拼，其实就两步</h3>
                  <p className="mt-3 text-sm leading-7">
                    一个键打声母，
                    <br />
                    一个键打韵母。
                  </p>
                  <div className="tip-example">
                    <span>
                      秋 <small>qiu</small>
                    </span>
                    <div>
                      <kbd>Q</kbd>
                      <span>+</span>
                      <kbd>Q</kbd>
                    </div>
                    <p>
                      q · 声母 <span>iu · 韵母</span>
                    </p>
                  </div>
                  <p className="text-xs leading-6">
                    先读出来，再敲下去。
                    <br />
                    让声音和手指一起记住。
                  </p>
                </section>
                <div className="px-1">
                  <div className="mb-3 flex justify-between text-xs text-stone-500">
                    <span>学习旅程</span>
                    <strong className="text-emerald-800">{mastered} / 8 组已掌握</strong>
                  </div>
                  <Bar value={(mastered / 8) * 100} label="课程掌握进度" />
                </div>
              </aside>
            </div>
          )}
          {page === "layout" && (
            <>
              <section className="panel p-5 sm:p-9">
                <h2 className="mb-8 font-semibold">小鹤双拼键位图</h2>
                <Keyboard active={selectedKey} onKey={setSelectedKey} />
                <p className="mt-6 text-center text-sm text-stone-500">
                  点击任意键位，查看映射和例字
                </p>
              </section>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="panel p-7">
                  <div className="flex items-center gap-5">
                    <kbd className="inspect-key">{selectedKey.toUpperCase()}</kbd>
                    <div>
                      <p className="eyebrow">当前键位</p>
                      <h2 className="mt-2 text-xl">
                        {KEYMAP[selectedKey].join(" / ")}
                        {INITIALS[selectedKey] && <small> · 声母 {INITIALS[selectedKey]}</small>}
                      </h2>
                    </div>
                  </div>
                  <div className="my-6 flex flex-wrap gap-3">
                    {EXAMPLES[selectedKey].slice(0, 4).map((x) => (
                      <div key={x.han} className="example">
                        <strong>{x.han}</strong>
                        <span>
                          {x.py} · {x.answer}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    data-variant="solid"
                    onClick={() => {
                      setPage("practice");
                      chooseGroup(GROUPS.find((g) => g.keys.includes(selectedKey))!.id);
                    }}
                  >
                    练习所在分组
                    <Icon name="arrow" />
                  </Button>
                </section>
                <section className="panel p-7">
                  <h3 className="mb-5 font-semibold">零声母，记住三个规则</h3>
                  <div className="rule">
                    <kbd>aa</kbd>
                    <p>
                      单字母重复打<small>a · o · e</small>
                    </p>
                  </div>
                  <div className="rule">
                    <kbd>ai</kbd>
                    <p>
                      双字母保持全拼<small>ai · an · er · ou…</small>
                    </p>
                  </div>
                  <div className="rule">
                    <kbd>ah</kbd>
                    <p>
                      三字母：首字母 + 韵母键<small>ang → ah · eng → eg</small>
                    </p>
                  </div>
                  <a
                    className="text-xs text-emerald-800 underline"
                    href="https://flypy.cc/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    规则来源：小鹤官方网站 ↗
                  </a>
                </section>
              </div>
            </>
          )}
          {!session && page === "random" && (
            <div className="grid gap-5 md:grid-cols-2">
              {(["syllable", "mapping"] as const).map((type) => (
                <section className="panel p-8" key={type}>
                  <div className="mode-art">
                    {type === "syllable" ? "鹤" : "iu"}
                    <kbd>{type === "syllable" ? "H E" : "Q"}</kbd>
                  </div>
                  <p className="eyebrow mt-6">{type === "syllable" ? "组合输入" : "巩固映射"}</p>
                  <h2 className="mt-3 text-xl font-semibold">
                    随机{type === "syllable" ? "拼字" : "韵母"}
                  </h2>
                  <p className="my-4 text-sm leading-7 text-stone-500">
                    {type === "syllable"
                      ? "两键一字。练习一段时间后，会自动多出常错键位对应的字。"
                      : "打乱所有韵母，找到对应按键。适合刚记完键位的你。"}
                  </p>
                  <Button
                    data-variant="solid"
                    onClick={() => {
                      setPracticeType(type);
                      start("random", groupId, type);
                    }}
                  >
                    开始{type === "syllable" ? "拼字" : "韵母"}练习 · 30 题<Icon name="arrow" />
                  </Button>
                </section>
              ))}
            </div>
          )}
          {!session && page === "mistakes" && (
            <section className="panel mb-6 p-5 sm:p-6" aria-labelledby="key-stats-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="key-stats-heading" className="text-lg font-semibold">
                    键位错误率
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    按应按的键位和位置记录。显示答案后的按键不计入。常错的键会在随机拼字中多出现。
                  </p>
                </div>
                {keyStats.some((stat) => stat.errors > 0) && (
                  <Button
                    data-variant="solid"
                    onClick={() => {
                      navigate("random");
                      setPracticeType("syllable");
                      start("random", groupId, "syllable");
                    }}
                  >
                    去随机拼字
                  </Button>
                )}
              </div>
              {keyStats.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-72 text-left text-sm">
                    <thead className="text-stone-600">
                      <tr>
                        <th scope="col" className="py-2">
                          键位
                        </th>
                        <th scope="col">位置</th>
                        <th scope="col" className="text-right">
                          错 / 尝试
                        </th>
                        <th scope="col" className="text-right">
                          错误率
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllKeyStats ? keyStats : keyStats.slice(0, 8)).map((stat) => (
                        <tr key={stat.role + ":" + stat.key} className="border-t border-stone-100">
                          <td className="py-2">
                            <kbd>{stat.key.toUpperCase()}</kbd>
                          </td>
                          <td>{keyRoleLabels[stat.role]}</td>
                          <td className="text-right tabular-nums">
                            {stat.errors} / {stat.attempts}
                          </td>
                          <td className="text-right font-semibold tabular-nums">
                            {Math.round((100 * stat.errors) / stat.attempts)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {keyStats.length > 8 && (
                    <Button
                      className="mt-2"
                      data-variant="ghost"
                      aria-expanded={showAllKeyStats}
                      onClick={() => setShowAllKeyStats(!showAllKeyStats)}
                    >
                      {showAllKeyStats ? "只看前 8 个键位" : "查看全部键位"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-600">从下一次练习开始记录键位数据。</p>
              )}
            </section>
          )}
          {!session &&
            page === "mistakes" &&
            (mistakes.length ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm text-stone-500">{mistakes.length} 道待复习</p>
                  <Button data-variant="solid" onClick={() => start("mistakes")}>
                    开始错题复习
                    <Icon name="arrow" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mistakes
                    .sort((a, b) => b.misses - a.misses)
                    .map((x) => (
                      <section key={x.id} className="panel p-6">
                        <strong className="text-3xl">{x.han || x.prompt}</strong>
                        <p className="my-4 text-sm text-stone-600">
                          {x.py || x.prompt}
                          <kbd className="ml-3">{x.answer.toUpperCase()}</kbd>
                        </p>
                        <div className="flex justify-between text-xs text-stone-500">
                          <span>错过 {x.misses} 次</span>
                          <span>已巩固 {x.streak} / 3</span>
                        </div>
                      </section>
                    ))}
                </div>
              </>
            ) : (
              <section className="panel py-20 text-center">
                <div className="result-seal">✓</div>
                <h2 className="my-5 text-xl font-semibold">这里还是一张白纸。</h2>
                <p className="mb-7 text-sm text-stone-500">
                  练习中遇到不熟悉的键位，会自动收集在这里。
                </p>
                <Button data-variant="solid" onClick={() => navigate("practice")}>
                  去练习，慢慢熟悉
                  <Icon name="arrow" />
                </Button>
              </section>
            ))}
          {!session && page === "articles" && (
            <div className="space-y-8">
              <div className="panel p-4 sm:p-5">
                <p className="mb-2 text-sm">
                  文章练习进度{" "}
                  <strong>
                    已练习 {articleCount} / {ARTICLES.length} 篇
                  </strong>
                </p>
                <Bar value={(articleCount / ARTICLES.length) * 100} label="文章练习完成度" />
              </div>
              <Choice
                label="文章分类"
                value={articleCategory}
                options={["全部", ...articleCategories].map((tag) => [tag, tag])}
                onChange={setArticleCategory}
              />
              {articleCategories
                .filter((tag) => articleCategory === "全部" || articleCategory === tag)
                .map((tag) => (
                  <section key={tag}>
                    <h2 className="mb-3 text-lg font-semibold">{tag}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {ARTICLES.filter((article) => article.tag === tag).map((a) => (
                        <article className="panel flex flex-col items-start p-5" key={a.id}>
                          <div className="flex w-full items-baseline justify-between gap-3">
                            <h3 className="text-base font-semibold">{a.title}</h3>
                            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-stone-600">
                              <span>{a.syllables.split(" ").length} 字</span>
                              {articleCompletion[a.id]?.articles || shadowCompleted.has(a.id) ? (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-900">
                                  已练习
                                </span>
                              ) : (
                                <span>未练习</span>
                              )}
                            </div>
                          </div>
                          {a.description && (
                            <p className="mt-2 text-sm leading-6 text-stone-500">{a.description}</p>
                          )}
                          <blockquote className="my-4 line-clamp-3 text-sm leading-7 text-stone-600">
                            {a.text}
                          </blockquote>
                          <div className="mt-auto flex flex-wrap gap-2">
                            <Button
                              data-variant="solid"
                              onClick={() => start("articles", groupId, "syllable", a.id)}
                            >
                              练习《{a.title}》
                            </Button>
                            <Button
                              data-variant="ghost"
                              aria-label={`影子跟打《${a.title}》`}
                              onClick={() => startShadow(a.id)}
                            >
                              影子跟打
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
          <footer className="page-footer">
            <span>鹤习 · 把练习变成习惯</span>
            <span>进度保存在当前浏览器</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
