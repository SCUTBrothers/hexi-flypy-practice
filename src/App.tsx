import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame";
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
import {
  playKeySound,
  readKeySound,
  soundPreference,
  type KeySound,
  type KeyVoice,
} from "./key-sound";
import { ArticleLine } from "./ArticleLine";
import { ShadowPractice } from "./ShadowPractice";
import { ROW_COURSES, type RowCourse } from "./row-course";
import { applyTheme, getTheme, readTheme, THEMES, type ThemeId } from "./theme";

const pages: Record<Page, { label: string; icon: string; title: string; description: string }> = {
  practice: {
    label: "进阶练习",
    icon: "grid",
    title: "分组练习",
    description: "按组记忆小鹤韵母，每轮 20 题，每字两键。",
  },
  rows: {
    label: "盲打课程",
    icon: "keyboard",
    title: "按键盘行练双拼",
    description: "食指轻放 F、J 定位点，强化同排盲打节奏。",
  },
  shadow: {
    label: "影子跟打",
    icon: "flame",
    title: "影子跟打",
    description: "连续跟打整篇文章，与目标配速或上次记录同屏竞速。",
  },
  articles: {
    label: "文章练习",
    icon: "text",
    title: "文章库",
    description: "选择文章逐字精练，或一键开启影子跟打。",
  },
  random: {
    label: "随机练习",
    icon: "shuffle",
    title: "随机练习",
    description: "打乱顺序检验反应，自动加练高频错键。",
  },
  mistakes: {
    label: "错题本",
    icon: "book",
    title: "错题本",
    description: "错题自动收录，连续独立答对 3 次自动移出。",
  },
  layout: {
    label: "键位速查",
    icon: "compass",
    title: "键位速查",
    description: "点击任意键位查看声韵母映射与常用例字。",
  },
};

const navOrder: readonly Page[] = [
  "practice",
  "rows",
  "shadow",
  "articles",
  "random",
  "mistakes",
  "layout",
];

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
    flame: (
      <>
        <path d="M12 3c.5 4-2.5 5.5-2.5 8.5a4.5 4.5 0 0 0 9 0c0-3.5-2.5-5.5-3.5-8.5-.5 2-1.5 2.5-3 0Z" />
        <path d="M8.5 14.5A3.5 3.5 0 0 0 12 18" />
      </>
    ),
    shuffle: (
      <path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4" />
    ),
    book: <path d="M5 3h14v18H6a3 3 0 0 1 0-6h13M5 3v12M9 7h6M9 10h4" />,
    text: <path d="M5 4h14M12 4v16M9 20h6M5 4v3M19 4v3" />,
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" />
      </>
    ),
    sound: <path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    leaf: <path d="M20 3C7 2 2 8 5 15c7 5 15-1 15-12ZM5 20 16 8" />,
    palette: (
      <>
        <circle cx="13.5" cy="6.5" r="1" />
        <circle cx="17.5" cy="10.5" r="1" />
        <circle cx="8.5" cy="7.5" r="1" />
        <circle cx="6.5" cy="12.5" r="1" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 1.8-.8 1.8-1.8 0-.4-.2-.8-.4-1.2-.3-.3-.4-.7-.4-1.2 0-1 .8-1.8 1.8-1.8H17c2.8 0 5-2.2 5-5 0-5-4.5-9-10-9Z" />
      </>
    ),
    focus: (
      <>
        <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
      </>
    ),
    restart: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 0 1 4.8.8c0 1.7-2.3 2.2-2.3 3.7M12 17.5h.01" />
      </>
    ),
  };
  return (
    <svg
      className={"icon " + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
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
    <label className="mt-switch-label" data-checked={checked || undefined}>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled}>
        <SwitchThumb />
      </Switch>
      <span>{label}</span>
    </label>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <Progress value={value} aria-label={label} className="mt-progress w-full min-w-0">
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  );
}

function Keyboard({
  selected = "",
  active = "",
  pressed,
  onKey,
}: {
  selected?: string;
  active?: string;
  pressed?: { key: string; wrong: boolean };
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
              data-press={pressed?.key === k ? (pressed.wrong ? "wrong" : "hit") : undefined}
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
      <span className="mt-review-label">上一题</span>
      <strong>{item.han || item.prompt}</strong>
      {item.py && <span className="mt-review-py">{item.py}</span>}
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

function hasOpenLayer(): boolean {
  if (document.querySelector('[role="dialog"]:not([hidden]), [data-open][data-slot$="-content"]')) {
    return true;
  }
  try {
    return Boolean(document.querySelector("[popover]:popover-open"));
  } catch {
    return false;
  }
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

function readKeyboardVisible(): boolean {
  try {
    return localStorage.getItem("hexi-keyboard-v1") !== "hidden";
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

  const [themeId, setThemeId] = useState<ThemeId>(readTheme);
  const [themeOpen, setThemeOpen] = useState(false);
  const [hints, setHints] = useState(false);
  const [soundHints, setSoundHints] = useState(() => readDisplayHint("soundHints"));
  const [pinyinHints, setPinyinHints] = useState(() => readDisplayHint("pinyinHints"));
  const [showKeyboard, setShowKeyboard] = useState(readKeyboardVisible);
  const [listenOnly, setListenOnly] = useState(false);
  const [audioSettings, setAudioSettings] = useState(readAudioSettings);
  const [unlocked, setUnlocked] = useState(false);
  const [voice, setVoice] = useState(SpeechCoach.snapshot);
  const [selectedKey, setSelectedKey] = useState("q");
  const [saveError, setSaveError] = useState("");
  const [keySound, setKeySound] = useState(readKeySound);
  const [soundOpen, setSoundOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const focusAfterSound = useRef(false);
  const focusAfterGroup = useRef(false);
  const focusAfterTheme = useRef(false);
  const [focusMode, setFocusMode] = useState(false);
  const [typingActive, setTypingActive] = useState(false);
  const [drillTyping, setDrillTyping] = useState(false);
  const [drillFocused, setDrillFocused] = useState(true);
  const [pressed, setPressed] = useState<{ key: string; wrong: boolean }>();
  const [mistakeSeq, setMistakeSeq] = useState(0);
  const releaseKey = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drillIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [articleCategory, setArticleCategory] = useState("全部");
  const query = search.trim().toLowerCase();
  const foundArticles =
    page === "articles" && !session
      ? ARTICLES.filter(
          (article) =>
            (articleCategory === "全部" || article.tag === articleCategory) &&
            (!query ||
              [article.title, article.text, article.description, article.tag].some((field) =>
                field.toLowerCase().includes(query),
              )),
        )
      : [];
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
  const activeTheme = getTheme(themeId);
  const isTypingPage = Boolean(session && !session.done);
  const anyDialogOpen = helpOpen || soundOpen || groupOpen || themeOpen;
  const zenFade = typingActive && isTypingPage && !session?.paused && !anyDialogOpen;

  const handleTypingActivity = useCallback((active: boolean) => {
    setTypingActive(active);
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

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
    try {
      localStorage.setItem("hexi-keyboard-v1", showKeyboard ? "shown" : "hidden");
    } catch {
      /* Preference persistence is optional. */
    }
  }, [showKeyboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) dispatch({ type: "tick", now: Date.now() });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session?.paused) inputRef.current?.focus({ preventScroll: true });
  }, [session?.items, session?.paused]);

  // Keep the drill input value and caret synced after focus or interrupted IME compositions.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || composing.current) return;
    const expected = session?.input ?? "";
    if (el.value !== expected) el.value = expected;
    if (document.activeElement !== el) return;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) {
      el.setSelectionRange(end, end);
    }
  }, [session?.input, session?.index]);

  useEffect(() => {
    if (!zenFade) return;
    const wakeChrome = (event: PointerEvent) => {
      const prev = lastPointer.current;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      if (!prev) return;
      if (Math.hypot(event.clientX - prev.x, event.clientY - prev.y) > 8) {
        setTypingActive(false);
      }
    };
    window.addEventListener("pointermove", wakeChrome, { passive: true });
    return () => {
      window.removeEventListener("pointermove", wakeChrome);
      lastPointer.current = null;
    };
  }, [zenFade]);

  useEffect(() => {
    if (
      unlocked &&
      autoRead &&
      session &&
      session.mode !== "shadow" &&
      !session.paused &&
      !session.done &&
      !helpOpen &&
      !soundOpen
    ) {
      SpeechCoach.speak(audioItem(session.items[session.index]), rate);
    }
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
    soundOpen,
  ]);

  const submitRef = useRef(submit);
  submitRef.current = submit;
  const sessionInputRef = useRef(session?.input ?? "");
  sessionInputRef.current = session?.input ?? "";

  // In drill modes, pressing a plain letter while focused on non-text chrome snaps back and types immediately.
  useEffect(() => {
    if (!session || session.done || session.paused || page === "shadow" || page === "rows") return;
    if (anyDialogOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (!/^[a-z]$/i.test(event.key)) return;
      const activeEl = document.activeElement;
      if (
        activeEl?.closest(
          'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="textbox"], [role="dialog"], [popover]',
        )
      ) {
        return;
      }
      if (hasOpenLayer()) return;
      const field = inputRef.current;
      if (!field || field.disabled) return;
      event.preventDefault();
      composing.current = false;
      field.focus({ preventScroll: true });
      submitRef.current(sessionInputRef.current + event.key.toLowerCase());
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [session?.done, session?.paused, page, anyDialogOpen]);

  useEffect(
    () => () => {
      clearTimeout(releaseKey.current);
      clearTimeout(drillIdle.current);
    },
    [],
  );

  function start(mode: Page, id = groupId, type = practiceType, articleId?: string) {
    SpeechCoach.stop();
    setHints(false);
    setTypingActive(false);
    setDrillTyping(false);
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
    // Sentence choice runs only on user-initiated navigation/restart, never during render.
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
    setTypingActive(false);
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

  function changeSound(next: KeySound) {
    setKeySound(next);
    try {
      localStorage.setItem(soundPreference, JSON.stringify(next));
    } catch {
      // Storage can be disabled in a private browsing session.
    }
    playKeySound(next);
  }

  function toggleFocus() {
    setFocusMode((enabled) => !enabled);
    (inputRef.current ?? document.querySelector<HTMLInputElement>(".shadow-input"))?.focus({
      preventScroll: true,
    });
  }

  function submit(value: string) {
    if (composing.current) return;
    const letters = value.toLowerCase();
    if (
      current &&
      session &&
      !session.done &&
      !session.paused &&
      /^[a-z]{1,2}$/.test(letters) &&
      letters !== session.input &&
      !session.input.startsWith(letters)
    ) {
      const wrong = !current.answer.startsWith(letters);
      playKeySound(keySound, wrong);
      setPressed({ key: letters.at(-1)!, wrong });
      if (wrong) setMistakeSeq((seq) => seq + 1);
      clearTimeout(releaseKey.current);
      releaseKey.current = setTimeout(() => setPressed(undefined), 125);
      if (page !== "shadow" && page !== "rows") {
        setTypingActive(true);
        setDrillTyping(true);
        clearTimeout(drillIdle.current);
        drillIdle.current = setTimeout(() => setDrillTyping(false), 650);
      }
    }
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
      } else {
        chooseGroup(GROUPS[(GROUPS.findIndex((g) => g.id === groupId) + 1) % GROUPS.length].id);
      }
    } else {
      SpeechCoach.stop();
      dispatch({ type: "start", session: null });
    }
  }

  const groupButtons =
    page === "practice" &&
    GROUPS.map((g, i) => (
      <Button
        key={g.id}
        onClick={() => {
          if (groupOpen) {
            focusAfterGroup.current = true;
            setGroupOpen(false);
          }
          if (g.id !== groupId) chooseGroup(g.id);
          else inputRef.current?.focus({ preventScroll: true });
        }}
        className="course-card"
        aria-current={groupId === g.id ? "step" : undefined}
      >
        <span className="course-number">{isDone(g.id) ? "✓" : String(i + 1).padStart(2, "0")}</span>
        <span className="min-w-0">
          <strong>{g.label}</strong>
          <small>
            {g.id === "initial" ? "SH · CH · ZH" : g.keys.split("").join(" ").toUpperCase()}
          </small>
        </span>
      </Button>
    ));

  const drillSpeed =
    session && session.activeMs > 1000
      ? Math.round(session.index / (session.activeMs / 60000))
      : null;

  const previousStream =
    session && !hidden ? session.items.slice(Math.max(0, session.index - 2), session.index) : [];
  const upcomingStream =
    session && !hidden ? session.items.slice(session.index + 1, session.index + 6) : [];

  const practicePanel = session && page !== "shadow" && page !== "rows" && (
    <div className="mt-drill-stage">
      {!session.done && (
        <div className="mt-config-bar mt-chrome-fade" role="toolbar" aria-label="练习配置">
          {page !== "practice" && (
            <>
              <Button
                data-variant="ghost"
                className="mt-bar-btn"
                onClick={() => {
                  SpeechCoach.stop();
                  setTypingActive(false);
                  dispatch({ type: "start", session: null });
                }}
              >
                返回列表
              </Button>
              <span className="mt-bar-sep" aria-hidden="true" />
            </>
          )}

          {page === "practice" && (
            <>
              <Dialog
                open={groupOpen}
                onOpenChange={(open) => {
                  if (open) focusAfterGroup.current = false;
                  setGroupOpen(open);
                }}
              >
                <DialogTrigger className="mt-bar-btn group-switch">切换分组</DialogTrigger>
                <DialogBackdrop />
                <DialogContent
                  className="group-dialog"
                  initialFocus='[aria-current="step"]'
                  finalFocus={() => (focusAfterGroup.current ? inputRef.current : null)}
                >
                  <DialogTitle>选择练习分组</DialogTitle>
                  <DialogDescription>按键盘位置选一组，打勾表示已掌握。</DialogDescription>
                  <div className="group-options">{groupButtons}</div>
                  <DialogClose data-variant="ghost">取消</DialogClose>
                </DialogContent>
              </Dialog>

              {!["initial", "zero"].includes(groupId) && (
                <>
                  <span className="mt-bar-sep" aria-hidden="true" />
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
                </>
              )}
              <span className="mt-bar-sep" aria-hidden="true" />
            </>
          )}

          {current?.kind === "syllable" && (
            <>
              <Setting label="拼音提示" checked={pinyinHints} onChange={setPinyinHints} />
              <Setting label="声韵母提示" checked={soundHints} onChange={setSoundHints} />
            </>
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
          <span className="mt-bar-sep" aria-hidden="true" />
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
      )}

      {page === "practice" && !session.done && (
        <div className="course-grid mt-chrome-fade" aria-label="键位分组">
          {groupButtons}
        </div>
      )}

      {session.done ? (
        <section className="mt-drill-result" aria-label="本轮练习结果">
          <div className="mt-result-badge">✓</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">本轮练习完成</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {page === "practice"
              ? group.label
              : page === "articles"
                ? ARTICLES.find((a) => a.id === session.articleId)?.title
                : pages[page].label}
          </p>
          <dl className="mt-drill-kpis">
            <div>
              <dt>正确率</dt>
              <dd className="tabular-nums">
                <strong>{accuracy}%</strong>
              </dd>
            </div>
            <div>
              <dt>完成题数</dt>
              <dd className="tabular-nums">
                <strong>{session.items.length}</strong>
              </dd>
            </div>
            <div>
              <dt>输入速度</dt>
              <dd className="tabular-nums">
                <strong>{drillSpeed ?? "—"}</strong>
                <span> 题/分</span>
              </dd>
            </div>
            <div>
              <dt>错误尝试</dt>
              <dd className="tabular-nums">
                <strong>{session.attempts - session.correct}</strong>
              </dd>
            </div>
          </dl>
          {session.lastAnswer && <Answer item={session.lastAnswer} />}
          <p className="mt-4 text-xs text-muted-foreground">
            {session.assisted
              ? "本轮使用了提示；独立完成且正确率达到 90% 可点亮分组。"
              : "每一次重复，都让手指更稳一点。"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => start(page, groupId, practiceType, session.articleId)}>
              再练一轮
            </Button>
            <Button data-variant="solid" onClick={nextRound}>
              {page === "practice" ? "继续下一步" : "返回练习列表"}
              <Icon name="arrow" />
            </Button>
          </div>
        </section>
      ) : (
        <div className="mt-arena-body">
          <div className="mt-stage-meta">
            <div className="mt-stage-identity">
              <h2 className="mt-stage-title">
                {page === "practice"
                  ? group.label
                  : page === "articles"
                    ? ARTICLES.find((a) => a.id === session.articleId)?.title
                    : pages[page].label}
              </h2>
              {page === "practice" && (
                <div className="mt-group-legend mt-chrome-fade" aria-label="本组键位提示">
                  {group.keys.split("").map((k) => (
                    <span className="mt-legend-chip" key={k}>
                      <kbd>{k.toUpperCase()}</kbd>
                      <span>{groupId === "initial" ? INITIALS[k] : KEYMAP[k].join("/")}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-live-stats tabular-nums">
              <strong className="mt-live-progress">
                {session.index + 1} / {session.items.length}
              </strong>
              <span>
                正确率 <b>{session.attempts ? accuracy + "%" : "—"}</b>
              </span>
              <span>
                <b>{drillSpeed ?? "—"}</b> 题/分
              </span>
              <Button
                data-variant="ghost"
                className="mt-inline-action mt-chrome-fade"
                onClick={() => {
                  dispatch({ type: "pause" });
                  SpeechCoach.stop();
                  setTypingActive(false);
                }}
              >
                {session.paused ? "继续练习" : "暂停练习"}
              </Button>
            </div>
          </div>

          <Bar label="本轮完成进度" value={(session.index / session.items.length) * 100} />

          {page === "articles" && (
            <ArticleLine
              text={ARTICLES.find((item) => item.id === session.articleId)!.text}
              index={session.index}
              offset={session.input.length}
              listenOnly={listenOnly}
              typing={drillTyping}
              error={!!session.error}
            />
          )}

          <div
            className="mt-drill-hero"
            data-blurred={!drillFocused && !session.paused ? "true" : undefined}
            onClick={() => {
              if (!session.paused) inputRef.current?.focus({ preventScroll: true });
            }}
          >
            {session.paused ? (
              <div className="mt-paused-box">
                <div className="question-word text-3xl">稍作休息</div>
                <p className="mt-3 text-sm text-muted-foreground">准备好了，再继续。</p>
              </div>
            ) : hidden ? (
              <div className="mt-listen-box">
                <div className="listening-orb">
                  <Icon name="sound" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">听一听，输入这个音的双拼</p>
                <Button
                  data-variant="ghost"
                  className="mt-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "reveal" });
                  }}
                >
                  查看题目提示
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-drill-stream">
                  <div className="mt-stream-side mt-stream-past" aria-hidden="true">
                    {previousStream.map((item, idx) => (
                      <span key={`${item.id}-${session.index - previousStream.length + idx}`}>
                        {item.han || item.prompt}
                      </span>
                    ))}
                  </div>

                  <div
                    className="mt-stream-active"
                    data-half={session.input.length > 0 ? "true" : undefined}
                    data-error={session.error ? "true" : undefined}
                    data-shake={
                      session.error && mistakeSeq ? (mistakeSeq % 2 === 0 ? "a" : "b") : undefined
                    }
                  >
                    <span
                      className="mt-drill-caret"
                      data-offset={session.input.length}
                      data-typing={drillTyping || undefined}
                      data-error={session.error ? "true" : undefined}
                      aria-hidden="true"
                    />
                    <div className="question-word" data-testid="question">
                      {current?.han || current?.prompt}
                    </div>
                  </div>

                  <div className="mt-stream-side mt-stream-future" aria-hidden="true">
                    {upcomingStream.map((item, idx) => (
                      <span
                        key={`${item.id}-${session.index + 1 + idx}`}
                        style={{ opacity: Math.max(0.14, 0.46 - idx * 0.08) }}
                      >
                        {item.han || item.prompt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-drill-hints">
                  {current?.py && pinyinHints && (
                    <p className="mt-pinyin-readout" data-testid="pinyin">
                      {current.py}
                    </p>
                  )}
                  {current?.py && soundHints && (
                    <p className="mt-sound-readout" data-testid="sound-hints">
                      {sounds(current).initial ? (
                        <>
                          声母 <b>{sounds(current).initial}</b>
                          <span className="mx-2 opacity-40">/</span>韵母{" "}
                          <b>{sounds(current).final}</b>
                        </>
                      ) : (
                        `零声母音节 ${current.py}`
                      )}
                    </p>
                  )}
                </div>
              </>
            )}

            <Field className="mt-code-field">
              <FieldLabel className="sr-only">双拼输入</FieldLabel>
              <Input
                ref={inputRef}
                value={session.input}
                onFocus={(event) => {
                  setDrillFocused(true);
                  const el = event.currentTarget;
                  const end = el.value.length;
                  el.setSelectionRange(end, end);
                  requestAnimationFrame(() => {
                    if (document.activeElement === el) {
                      const len = el.value.length;
                      el.setSelectionRange(len, len);
                    }
                  });
                }}
                onBlur={() => {
                  composing.current = false;
                  setDrillFocused(false);
                }}
                onValueChange={(value, details) => {
                  const nativeEvent = details.event;
                  if (nativeEvent && "isComposing" in nativeEvent && !nativeEvent.isComposing) {
                    composing.current = false;
                  }
                  const letters = value.toLowerCase();
                  if (
                    current &&
                    (letters === current.answer || !current.answer.startsWith(letters))
                  ) {
                    details.cancel();
                  }
                  submit(value);
                }}
                disabled={session.paused}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={(e) => {
                  composing.current = false;
                  const text = e.data || e.currentTarget.value;
                  submit(/^[a-z]+$/i.test(text) ? text : "中文");
                }}
                onKeyDown={(e) => {
                  if (!e.nativeEvent.isComposing && e.key !== "Process" && e.keyCode !== 229) {
                    composing.current = false;
                  }
                  if (e.key === " " && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    play();
                  }
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={current?.kind === "mapping" ? "输入韵母键" : "输入两位字母"}
                data-mistyped={!!session.error || undefined}
                data-partial={!!session.input || undefined}
                className="typing-input"
              />
            </Field>

            <div className="code-steps" aria-hidden="true">
              <i
                data-filled={!!session.input || undefined}
                data-error={!!session.error || undefined}
              />
              {current?.answer.length === 2 && <i data-error={!!session.error || undefined} />}
            </div>

            <div className="mt-drill-feedback" aria-live="polite">
              {session.error ? (
                <span className="mt-error-text">{session.error}</span>
              ) : hints && !hidden ? (
                <span className="mt-accent-text">正确按键：{current?.answer.toUpperCase()}</span>
              ) : !drillFocused && !session.paused ? (
                <span className="text-muted-foreground">按任意字母键或点击此处继续输入</span>
              ) : (
                <span className="text-muted-foreground">
                  英文输入法 · 空格重听 · 输对自动下一题
                </span>
              )}
            </div>

            {session.lastAnswer && <Answer item={session.lastAnswer} />}
          </div>

          <div className="mt-restart-row">
            <Button
              data-variant="ghost"
              className="mt-restart-btn"
              onClick={() => start(page, groupId, practiceType, session.articleId)}
            >
              <Icon name="restart" />
              重新开始
            </Button>
            <Button
              data-variant="ghost"
              className="mt-restart-btn mt-chrome-fade"
              aria-pressed={showKeyboard}
              onClick={() => {
                setShowKeyboard((v) => !v);
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              <Icon name="keyboard" />
              {showKeyboard ? "收起键位图" : "显示键位图"}
            </Button>
          </div>

          {showKeyboard && (
            <section className="mt-keymap-dock" aria-label="小鹤虚拟键盘">
              <Keyboard
                pressed={pressed}
                selected={page === "practice" ? group.keys : ""}
                active={
                  hints && !hidden && !session.done ? current?.answer[session.input.length] : ""
                }
                onKey={(k) => {
                  submit(session.input + k);
                  inputRef.current?.focus({ preventScroll: true });
                }}
              />
            </section>
          )}

          <div className="audio-toolbar mt-chrome-fade">
            <Button
              data-variant="ghost"
              onClick={play}
              disabled={!voice.available || session.paused}
              className="mt-bar-btn"
            >
              <Icon name="sound" />
              重听
            </Button>
            <span className="mt-bar-sep" aria-hidden="true" />
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
            <span className="mt-bar-sep" aria-hidden="true" />
            <Setting
              label="自动朗读"
              checked={autoRead}
              disabled={!voice.available}
              onChange={(v) => {
                setUnlocked(true);
                setAudioSettings((s) => ({ ...s, autoRead: v }));
              }}
            />
            <p aria-live="polite" className="mt-voice-status">
              {voice.message}
              {!voice.available && (
                <Button
                  data-variant="ghost"
                  className="mt-bar-btn"
                  onClick={() => SpeechCoach.refresh()}
                >
                  重新检测
                </Button>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="app-shell"
      data-focus={focusMode && session ? "on" : undefined}
      data-typing={zenFade ? "on" : undefined}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !(event.target as HTMLElement).closest("[popover]") &&
          !anyDialogOpen &&
          !event.nativeEvent.isComposing
        ) {
          setTypingActive(false);
          if (focusMode) setFocusMode(false);
        }
      }}
    >
      <header className="studio-header mt-chrome-fade">
        <div className="studio-header-inner">
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
            <span className="brand-text">
              鹤习<small>flypy</small>
            </span>
          </a>

          <nav className="studio-nav" aria-label="主要导航">
            {navOrder.map((p) => (
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
              </Button>
            ))}
          </nav>

          <div className="practice-tools">
            {session && (
              <Button className="tool-trigger" aria-pressed={focusMode} onClick={toggleFocus}>
                <Icon name="focus" />
                <span>{focusMode ? "退出专注" : "专注模式"}</span>
              </Button>
            )}

            <Dialog
              open={soundOpen}
              onOpenChange={(open, details) => {
                focusAfterSound.current = !open && details.reason === "close-press";
                setSoundOpen(open);
              }}
            >
              <DialogTrigger className="tool-trigger">
                <Icon name="sound" />
                <span>击键声</span>
              </DialogTrigger>
              <DialogBackdrop />
              <DialogContent
                className="help-dialog"
                finalFocus={() => {
                  if (!focusAfterSound.current || !session || session.done || session.paused) {
                    return null;
                  }
                  return (
                    inputRef.current ?? document.querySelector<HTMLInputElement>(".shadow-input")
                  );
                }}
              >
                <DialogTitle>击键声音</DialogTitle>
                <DialogDescription>选中音色即可试听。输错时会响起低音。</DialogDescription>
                <div className="sound-setting">
                  <span>音色</span>
                  <Choice
                    label="击键音色"
                    value={keySound.voice}
                    options={[
                      ["off", "静音"],
                      ["wood", "木键"],
                      ["switch", "机械键"],
                    ]}
                    onChange={(nextVoice) =>
                      changeSound({ ...keySound, voice: nextVoice as KeyVoice })
                    }
                  />
                </div>
                <div className="sound-setting">
                  <span>音量</span>
                  <Choice
                    label="击键音量"
                    value={String(keySound.volume)}
                    options={[
                      ["0.25", "轻"],
                      ["0.5", "中"],
                      ["0.85", "响"],
                    ]}
                    onChange={(volume) => changeSound({ ...keySound, volume: Number(volume) })}
                  />
                </div>
                <DialogClose data-variant="solid">完成</DialogClose>
              </DialogContent>
            </Dialog>

            <Dialog
              open={themeOpen}
              onOpenChange={(open, details) => {
                focusAfterTheme.current = !open && details.reason === "close-press";
                setThemeOpen(open);
              }}
            >
              <DialogTrigger className="tool-trigger" aria-label="界面主题">
                <Icon name="palette" />
                <span>{activeTheme.name}</span>
              </DialogTrigger>
              <DialogBackdrop />
              <DialogContent
                className="help-dialog"
                finalFocus={() => {
                  if (!focusAfterTheme.current || !session || session.done || session.paused) {
                    return null;
                  }
                  return (
                    inputRef.current ?? document.querySelector<HTMLInputElement>(".shadow-input")
                  );
                }}
              >
                <DialogTitle>界面主题</DialogTitle>
                <DialogDescription>挑选适合当下光线的打字配色，切换即时生效。</DialogDescription>
                <div className="mt-theme-grid">
                  {THEMES.map((item) => (
                    <Button
                      key={item.id}
                      className="mt-theme-card"
                      aria-pressed={item.id === themeId}
                      onClick={() => setThemeId(item.id)}
                    >
                      <span className="mt-theme-swatches" aria-hidden="true">
                        {item.swatches.map((hex, i) => (
                          <i key={i} style={{ backgroundColor: hex }} />
                        ))}
                      </span>
                      <span className="mt-theme-info">
                        <strong>{item.name}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                    </Button>
                  ))}
                </div>
                <DialogClose data-variant="solid">完成</DialogClose>
              </DialogContent>
            </Dialog>

            <Dialog
              open={helpOpen}
              onOpenChange={(v) => {
                setHelpOpen(v);
                if (v) SpeechCoach.stop();
              }}
            >
              <DialogTrigger className="help-trigger">
                <Icon name="help" />
                <span>练习指南</span>
              </DialogTrigger>
              <DialogBackdrop />
              <DialogContent className="help-dialog">
                <DialogTitle>练习指南</DialogTitle>
                <DialogDescription>先听音、拆拼音，再回想韵母所在的键。</DialogDescription>
                <ol className="my-5 list-decimal space-y-3 pl-5 text-sm leading-7">
                  <li>切换到英文输入法。每个汉字输入两位字母，答对自动进入下一题。</li>
                  <li>开始打字后周边栏会自动淡出；移动鼠标或按 Esc 即可呼回控制栏。</li>
                  <li>听音模式隐藏题目；空格可以重听，查看提示后本轮不会点亮分组。</li>
                  <li>错题连续独立答对三次自动移出。进度保存在当前浏览器，换设备不会自动同步。</li>
                  <li>按 Tab 再按 Enter 可快速重打当前轮次；朗读使用设备普通话语音。</li>
                </ol>
                <DialogClose data-variant="solid">知道了，开始练习</DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="main-content" data-arena={isTypingPage ? "true" : undefined}>
        {saveError && (
          <p className="mt-alert-banner" role="alert">
            {saveError}
          </p>
        )}

        {!session && (
          <div className="page-heading">
            <h1>{pages[page].title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{pages[page].description}</p>
          </div>
        )}

        {page === "rows" && session?.mode === "rows" && (
          <div className="mt-shadow-wrapper">
            <div className="mt-row-selector mt-chrome-fade" aria-label="盲打课程键位行">
              {ROW_COURSES.map((row) => (
                <Button
                  key={row.id}
                  className="course-card row-course-card"
                  aria-pressed={row.id === activeCourse.id}
                  aria-current={row.id === activeCourse.id ? "step" : undefined}
                  onClick={() => startRow(row)}
                >
                  <span className="min-w-0">
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
              themeKey={themeId}
              onInput={submit}
              onArticle={(id) => startRow(activeCourse, id)}
              onRestart={() => startRow(activeCourse, session.articleId)}
              onTypingActivity={handleTypingActivity}
            />
          </div>
        )}

        {page === "shadow" && session?.mode === "shadow" && (
          <div className="mt-shadow-wrapper">
            <div className="shadow-progress mt-chrome-fade">
              <p className="text-xs">
                影子跟打进度{" "}
                <strong>
                  已练习 {shadowCompleted.size} / {ARTICLES.length} 篇
                </strong>
              </p>
              <Bar value={(shadowCompleted.size / ARTICLES.length) * 100} label="影子跟打完成度" />
            </div>
            <ShadowPractice
              key={shadowRound}
              article={ARTICLES.find((article) => article.id === shadowArticleId)!}
              session={session}
              completed={shadowCompleted}
              pinyinHints={pinyinHints}
              themeKey={themeId}
              onInput={submit}
              onArticle={startShadow}
              onRestart={() => startShadow()}
              onTypingActivity={handleTypingActivity}
            />
          </div>
        )}

        {practicePanel}

        {page === "layout" && (
          <div className="flex flex-col gap-6">
            <Frame spacing="default">
              <FrameHeader>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">小鹤双拼键位图</h2>
                  <span className="text-xs text-muted-foreground">点击任意键位查看映射与例字</span>
                </div>
              </FrameHeader>
              <FramePanel>
                <Keyboard active={selectedKey} onKey={setSelectedKey} />
              </FramePanel>
            </Frame>

            <div className="grid gap-5 lg:grid-cols-2">
              <Frame spacing="default">
                <FramePanel className="flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <kbd className="inspect-key">{selectedKey.toUpperCase()}</kbd>
                    <div>
                      <p className="text-xs text-muted-foreground">当前键位</p>
                      <h2 className="mt-1 text-xl font-semibold">
                        {KEYMAP[selectedKey].join(" / ")}
                        {INITIALS[selectedKey] && (
                          <small className="ml-2 text-sm font-normal text-muted-foreground">
                            声母 {INITIALS[selectedKey]}
                          </small>
                        )}
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {EXAMPLES[selectedKey].slice(0, 4).map((x) => (
                      <div key={x.han} className="example">
                        <strong>{x.han}</strong>
                        <span>
                          {x.py} · {x.answer}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
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
                  </div>
                </FramePanel>
              </Frame>

              <Frame spacing="default">
                <FramePanel className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold">零声母，记住三个规则</h3>
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
                    className="mt-accent-link text-xs underline"
                    href="https://flypy.cc/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    规则来源：小鹤官方网站 ↗
                  </a>
                </FramePanel>
              </Frame>
            </div>
          </div>
        )}

        {!session && page === "random" && (
          <div className="grid gap-5 md:grid-cols-2">
            {(["syllable", "mapping"] as const).map((type) => (
              <Frame key={type} spacing="default">
                <FramePanel className="flex flex-col gap-4">
                  <div className="mode-art">
                    <span>{type === "syllable" ? "鹤" : "iu"}</span>
                    <kbd>{type === "syllable" ? "H E" : "Q"}</kbd>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {type === "syllable" ? "组合输入" : "巩固映射"}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      随机{type === "syllable" ? "拼字" : "韵母"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {type === "syllable"
                        ? "两键一字。练习一段时间后，会自动多出常错键位对应的字。"
                        : "打乱所有韵母，找到对应按键。适合刚记完键位的你。"}
                    </p>
                  </div>
                  <div className="mt-auto pt-2">
                    <Button
                      data-variant="solid"
                      onClick={() => {
                        setPracticeType(type);
                        start("random", groupId, type);
                      }}
                    >
                      开始{type === "syllable" ? "拼字" : "韵母"}练习 · 30 题<Icon name="arrow" />
                    </Button>
                  </div>
                </FramePanel>
              </Frame>
            ))}
          </div>
        )}

        {!session && page === "mistakes" && (
          <div className="flex flex-col gap-6">
            <Frame spacing="default">
              <FrameHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="key-stats-heading" className="text-sm font-semibold">
                      键位错误率
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      按应按的键位和位置记录。显示答案后的按键不计入。常错键会在随机拼字中多出现。
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
              </FrameHeader>
              <FramePanel>
                {keyStats.length ? (
                  <div className="overflow-x-auto">
                    {/* Compact static key-error summary table preserved for row-level accessibility and tests. */}
                    <table className="mt-data-table w-full min-w-72 text-left text-sm">
                      <thead>
                        <tr>
                          <th scope="col">键位</th>
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
                          <tr key={stat.role + ":" + stat.key}>
                            <td>
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
                        className="mt-3"
                        data-variant="ghost"
                        aria-expanded={showAllKeyStats}
                        onClick={() => setShowAllKeyStats(!showAllKeyStats)}
                      >
                        {showAllKeyStats ? "只看前 8 个键位" : "查看全部键位"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">从下一次练习开始记录键位数据。</p>
                )}
              </FramePanel>
            </Frame>

            {mistakes.length ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{mistakes.length} 道待复习</p>
                  <Button data-variant="solid" onClick={() => start("mistakes")}>
                    开始错题复习
                    <Icon name="arrow" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mistakes
                    .sort((a, b) => b.misses - a.misses)
                    .map((x) => (
                      <Frame key={x.id} spacing="sm">
                        <FramePanel className="flex flex-col gap-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <strong className="text-3xl font-medium">{x.han || x.prompt}</strong>
                            <kbd>{x.answer.toUpperCase()}</kbd>
                          </div>
                          <p className="font-mono text-sm text-muted-foreground">
                            {x.py || x.prompt}
                          </p>
                          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>错过 {x.misses} 次</span>
                            <span>已巩固 {x.streak} / 3</span>
                          </div>
                        </FramePanel>
                      </Frame>
                    ))}
                </div>
              </div>
            ) : (
              <Frame spacing="default">
                <FramePanel className="py-12 text-center">
                  <div className="mt-result-badge">✓</div>
                  <h2 className="mt-4 text-lg font-semibold">这里还是一张白纸。</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    练习中遇到不熟悉的键位，会自动收集在这里。
                  </p>
                  <div className="mt-5">
                    <Button data-variant="solid" onClick={() => navigate("practice")}>
                      去练习，慢慢熟悉
                      <Icon name="arrow" />
                    </Button>
                  </div>
                </FramePanel>
              </Frame>
            )}
          </div>
        )}

        {!session && page === "articles" && (
          <div className="flex flex-col gap-5">
            <Frame spacing="default">
              <FramePanel className="flex flex-col gap-2">
                <p className="text-sm">
                  文章练习进度{" "}
                  <strong>
                    已练习 {articleCount} / {ARTICLES.length} 篇
                  </strong>
                </p>
                <Bar value={(articleCount / ARTICLES.length) * 100} label="文章练习完成度" />
              </FramePanel>
            </Frame>

            <div className="library-tools">
              <Input
                type="search"
                aria-label="搜索文章"
                placeholder="搜索篇名、正文或练习音节"
                value={search}
                onValueChange={setSearch}
              />
              <Choice
                label="文章分类"
                value={articleCategory}
                options={["全部", ...articleCategories].map((tag) => [tag, tag])}
                onChange={setArticleCategory}
              />
              <span className="library-count" role="status">
                {foundArticles.length} 篇
              </span>
            </div>

            {!foundArticles.length && (
              <div className="library-empty">
                <p className="text-sm text-muted-foreground">没有找到匹配的文章</p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setArticleCategory("全部");
                  }}
                >
                  清除筛选
                </Button>
              </div>
            )}

            {articleCategories.map((tag) => {
              const articles = foundArticles.filter((article) => article.tag === tag);
              if (!articles.length) return null;
              return (
                <Frame stacked key={tag} spacing="sm">
                  <FrameHeader>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">{tag}</h2>
                      <Badge variant="outline">{articles.length} 篇</Badge>
                    </div>
                  </FrameHeader>
                  {articles.map((a) => (
                    <FramePanel key={a.id}>
                      <article className="library-row">
                        <div className="grid min-w-0 gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{a.title}</h3>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {a.syllables.split(" ").length} 字
                            </span>
                            {articleCompletion[a.id]?.articles || shadowCompleted.has(a.id) ? (
                              <Badge variant="success-light">已练习</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">未练习</span>
                            )}
                          </div>
                          {a.description && (
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          )}
                          <blockquote className="article-excerpt">{a.text}</blockquote>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            aria-label={`练习《${a.title}》`}
                            onClick={() => start("articles", groupId, "syllable", a.id)}
                          >
                            逐字练习
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
                    </FramePanel>
                  ))}
                </Frame>
              );
            })}
          </div>
        )}
      </main>

      <footer className="page-footer mt-chrome-fade">
        <div className="studio-footer-inner">
          <div className="mt-shortcuts" aria-label="快捷键提示">
            <span>
              <kbd>tab</kbd> + <kbd>enter</kbd> 重打
            </span>
            <span>
              <kbd>space</kbd> 重听
            </span>
            <span>
              <kbd>esc</kbd> 退出专注
            </span>
          </div>
          <div className="mt-footer-meta tabular-nums">
            <span>今日 {day} / 50 题</span>
            <span className="mt-dot-sep" aria-hidden="true" />
            <span>已掌握 {mastered} / 8 组</span>
            <span className="mt-dot-sep" aria-hidden="true" />
            <span>本地保存</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
