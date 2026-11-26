import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { ShadowArticlePicker } from "./ShadowArticlePicker";
import { ARTICLES } from "./data";
import type { Session } from "./practice";
import type { RowCourse } from "./row-course";
import { PassageCaret } from "./PassageCaret";
import { ShadowResults } from "./ShadowResults";
import {
  applyCaretTransform,
  caretPointForPosition,
  interpolatePacePoint,
  measurePassageLayout,
  rowShiftForGlyph,
  viewportHeightForRows,
  type PassageLayout,
} from "./shadow-motion";
import {
  getResult,
  loadShadow,
  recordStroke,
  saveShadow,
  strokeAt,
  type Stroke,
} from "./shadow-record";

type Article = (typeof ARTICLES)[number];

type GhostMark = {
  readonly index: number;
  readonly offset: number;
  readonly key?: string;
  readonly errors?: number;
};

const duration = (ms: number) => (ms / 1000).toFixed(1) + " 秒";
const articleGroups = [...new Set(ARTICLES.map((article) => article.tag))].map((tag) => ({
  tag,
  articles: ARTICLES.filter((article) => article.tag === tag),
}));
const articleOrder = articleGroups.flatMap(({ articles }) => articles);

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

function nextShadowArticle(id: string, completed: ReadonlySet<string>, order: Article[]) {
  const index = order.findIndex((article) => article.id === id);
  const following = [...order.slice(index + 1), ...order.slice(0, index)];
  return following.find((article) => !completed.has(article.id)) ?? following[0];
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const ShadowLiveMetrics = memo(function ShadowLiveMetrics({
  index,
  total,
  done,
  result,
  clockStart,
  clockLimit,
  isReplay,
}: {
  index: number;
  total: number;
  done: boolean;
  result: ReturnType<typeof getResult>;
  clockStart: number | null;
  clockLimit: number;
  isReplay: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (clockStart === null) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      if (document.hidden) return;
      const next = Math.min(performance.now() - clockStart, clockLimit);
      setElapsed(next);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [clockStart, clockLimit]);

  const displayedElapsed = isReplay ? elapsed : done ? result.elapsed : elapsed;
  const liveSpeed =
    !done && elapsed >= 1000 && index ? Math.round((index * 60000) / elapsed) : null;

  return (
    <div className="stroke-metrics">
      <span className="mt-metric-progress">
        {index} / {total} 字
      </span>
      {!isReplay && (
        <>
          <span className="mt-metric-speed">
            <b>{done ? result.speed : (liveSpeed ?? "—")}</b> 字/分
          </span>
          <span>
            击键准确率 <b>{result.keys ? Math.round(result.accuracy) + "%" : "—"}</b>
          </span>
        </>
      )}
      <span>
        {isReplay ? "回放" : "用时"} <b>{duration(displayedElapsed)}</b>
      </span>
    </div>
  );
});

const ShadowPassageGlyphs = memo(function ShadowPassageGlyphs({
  text,
  displayedIndex,
  sessionIndex,
  sessionDone,
  hasError,
  inputLength,
  wrongSeq,
  replayActive,
  ghostIndex,
  ghostOffset,
  ghostErrors,
  showGhost,
}: {
  text: string;
  displayedIndex: number;
  sessionIndex: number;
  sessionDone: boolean;
  hasError: boolean;
  inputLength: number;
  wrongSeq: number;
  replayActive: boolean;
  ghostIndex: number;
  ghostOffset: number;
  ghostErrors: boolean;
  showGhost: boolean;
}) {
  const chars = Array.from(text);
  const isHan = (ch: string) => /[\u3400-\u9fff]/.test(ch);
  const isOpeningPunct = (ch: string) => /^[“‘（《【「『(]$/.test(ch);
  const isClosingPunct = (ch: string) => /^[，。、！？；：,.!?;:”’）》】」』)—…·]$/.test(ch);
  let hanIndex = 0;
  const units: ReactNode[] = [];
  let pos = 0;

  while (pos < chars.length) {
    const group: ReactNode[] = [];
    const unitStart = pos;

    while (pos < chars.length && isOpeningPunct(chars[pos])) {
      const ch = chars[pos];
      group.push(
        <span key={pos} data-state={hanIndex <= displayedIndex ? "done" : "waiting"}>
          {ch}
        </span>,
      );
      pos++;
    }

    if (pos < chars.length && isHan(chars[pos])) {
      const ch = chars[pos];
      const i = hanIndex++;
      const active = !replayActive && i === sessionIndex && !sessionDone;
      const isError = !replayActive ? active && hasError : i === ghostIndex && ghostErrors;
      const state = i < displayedIndex ? "done" : isError ? "error" : "waiting";
      const caret = showGhost && ghostIndex === i ? ghostOffset : undefined;
      group.push(
        <span
          key={pos}
          data-glyph={i}
          data-state={state}
          data-active={active || undefined}
          data-half={active && inputLength > 0 ? "true" : undefined}
          data-shake={active && isError && wrongSeq ? (wrongSeq % 2 === 0 ? "a" : "b") : undefined}
          data-shadow-caret={caret}
          aria-current={active ? "true" : undefined}
        >
          {ch}
        </span>,
      );
      pos++;
    } else if (pos < chars.length && group.length === 0) {
      const ch = chars[pos];
      group.push(
        <span key={pos} data-state={hanIndex <= displayedIndex ? "done" : "waiting"}>
          {ch}
        </span>,
      );
      pos++;
    }

    while (pos < chars.length && isClosingPunct(chars[pos])) {
      const ch = chars[pos];
      group.push(
        <span key={pos} data-state={hanIndex <= displayedIndex ? "done" : "waiting"}>
          {ch}
        </span>,
      );
      pos++;
    }

    units.push(
      <span key={unitStart} className="mt-word-unit">
        {group}
      </span>,
    );
  }

  return <>{units}</>;
});

export function ShadowPractice({
  article,
  course,
  session,
  completed,
  pinyinHints,
  themeKey,
  onInput,
  onArticle,
  onRestart,
  onTypingActivity,
}: {
  article: Article;
  course?: RowCourse;
  session: Session;
  completed: ReadonlySet<string>;
  pinyinHints: boolean;
  themeKey?: string;
  onInput: (value: string) => void;
  onArticle: (id: string) => void;
  onRestart: () => void;
  onTypingActivity?: (active: boolean) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const passageRef = useRef<HTMLLabelElement>(null);
  const ghostCaretRef = useRef<HTMLElement>(null);
  const layoutRef = useRef<PassageLayout | null>(null);
  const composing = useRef(false);
  const firstInput = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const signature = article.text + "\n" + article.syllables;
  const [previous] = useState(() => loadShadow(article.id, signature));
  const [guide, setGuide] = useState(previous ? "last" : "off");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const [replayFinished, setReplayFinished] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [focused, setFocused] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ key: string; seq: number } | null>(null);
  const [layout, setLayout] = useState<PassageLayout | null>(null);
  const [ghostMark, setGhostMark] = useState<GhostMark>({ index: 0, offset: 0 });

  const current = session.items[session.index];
  const result = useMemo(() => getResult(strokes), [strokes]);
  const replay = session.done ? strokes : previous?.strokes;
  const replayDuration = replay?.at(-1)?.at ?? 0;
  const isReplaying = replayTime !== null && !replayFinished;
  const clockStart = isReplaying ? replayTime : session.done ? null : startTime;
  const clockLimit = isReplaying ? replayDuration : Infinity;
  const pace = !isReplaying && !session.done ? Number(guide) || 0 : 0;
  const showGhost =
    isReplaying || (!session.done && ((guide === "last" && !!previous) || pace > 0));
  const displayedIndex = isReplaying ? ghostMark.index : session.index;
  const next =
    session.done || course
      ? nextShadowArticle(article.id, completed, course?.sentences ?? articleOrder)
      : undefined;
  const sentence = course?.sentences.find((item) => item.id === article.id);

  const remeasure = useCallback(() => {
    const passage = passageRef.current;
    if (!passage) return;
    const measured = measurePassageLayout(passage);
    layoutRef.current = measured;
    setLayout(measured);
  }, []);

  useLayoutEffect(() => {
    remeasure();
    const passage = passageRef.current;
    if (!passage) return;
    const observer = new ResizeObserver(() => remeasure());
    observer.observe(passage);
    return () => observer.disconnect();
  }, [article.id, remeasure]);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) remeasure();
    });
    return () => {
      active = false;
    };
  }, [article.id, remeasure]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    passageRef.current?.scrollIntoView({ block: "nearest" });
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(wrongTimer.current);
      onTypingActivity?.(false);
    };
  }, [onTypingActivity]);

  useEffect(() => {
    if (session.done) {
      setIsTyping(false);
      onTypingActivity?.(false);
    }
  }, [session.done, onTypingActivity]);

  useEffect(() => {
    if (!session.done) return;
    setSaveFailed(!saveShadow(article.id, { signature, strokes }));
  }, [article.id, session.done, signature, strokes]);

  // Keep the hidden input value and caret pinned for soft keyboards and interrupted IME sessions.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || composing.current) return;
    if (el.value !== session.input) el.value = session.input;
    if (document.activeElement !== el) return;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) {
      el.setSelectionRange(end, end);
    }
  }, [session.input, session.index]);

  // Position ghost caret smoothly via rAF with zero per-frame React re-renders.
  useEffect(() => {
    if (!showGhost) return;

    const placeRestingGhost = () => {
      const mark = ghostCaretRef.current;
      const measured = layoutRef.current;
      if (!mark || !measured?.boxes.length) return;
      const point = caretPointForPosition(measured, 0, 0);
      if (point) applyCaretTransform(mark, point, true);
    };

    if (clockStart === null) {
      setGhostMark({ index: 0, offset: 0 });
      placeRestingGhost();
      return;
    }

    const totalItems = session.items.length;
    let lastIdx = -1;
    let lastOffset = -1;
    let lastKey: string | undefined;
    let lastErr = -1;
    let rafId = 0;
    let intervalId = 0;

    const stepFrame = () => {
      if (document.hidden) return false;
      const elapsedMs = Math.min(performance.now() - clockStart, clockLimit);
      const measured = layoutRef.current;
      const mark = ghostCaretRef.current;

      if (pace > 0) {
        const progress = Math.min(totalItems, (elapsedMs * pace) / 60000);
        const point = measured ? interpolatePacePoint(measured, progress) : null;
        if (mark && point) {
          // Pace mode glides frame-by-frame via rAF so CSS transform transition stays off.
          applyCaretTransform(mark, point, true);
        }
        const discreteSteps = Math.min(2 * totalItems, Math.floor((elapsedMs * pace) / 30000));
        const nextIdx = Math.floor(discreteSteps / 2);
        const nextOffset = discreteSteps % 2;
        if (nextIdx !== lastIdx || nextOffset !== lastOffset) {
          lastIdx = nextIdx;
          lastOffset = nextOffset;
          setGhostMark({ index: nextIdx, offset: nextOffset });
        }
        return elapsedMs >= (totalItems * 60000) / pace;
      }

      if (replay) {
        const currentStroke = strokeAt(replay, elapsedMs);
        const nextIdx = currentStroke?.index ?? 0;
        const nextOffset = currentStroke?.offset ?? 0;
        if (mark && measured?.boxes.length) {
          const point = caretPointForPosition(measured, nextIdx, nextOffset);
          if (point) applyCaretTransform(mark, point, false);
        }
        const nextErr = currentStroke?.errors ?? 0;
        if (
          nextIdx !== lastIdx ||
          nextOffset !== lastOffset ||
          currentStroke?.key !== lastKey ||
          nextErr !== lastErr
        ) {
          lastIdx = nextIdx;
          lastOffset = nextOffset;
          lastKey = currentStroke?.key;
          lastErr = nextErr;
          setGhostMark({
            index: nextIdx,
            offset: nextOffset,
            key: currentStroke?.key,
            errors: nextErr,
          });
        }
      }

      if (isReplaying && elapsedMs >= clockLimit) {
        setReplayFinished(true);
        return true;
      }
      return false;
    };

    if (prefersReducedMotion()) {
      stepFrame();
      intervalId = window.setInterval(() => {
        if (stepFrame()) window.clearInterval(intervalId);
      }, 250);
      return () => window.clearInterval(intervalId);
    }

    const loop = () => {
      if (!stepFrame()) {
        rafId = window.requestAnimationFrame(loop);
      }
    };
    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [showGhost, clockStart, clockLimit, pace, replay, session.items.length, isReplaying, layout]);

  const type = useCallback(
    (value: string) => {
      if (!current || composing.current) return;
      const now = performance.now();
      const started = firstInput.current ?? now;
      const stroke = recordStroke(
        Math.round(now - started),
        session.index,
        current.answer,
        session.input,
        value.toLowerCase(),
      );
      if (stroke) {
        if (firstInput.current === null) {
          firstInput.current = started;
          setStartTime(started);
          setReplayTime(null);
          setReplayFinished(false);
        }
        setStrokes((previousStrokes) => [...previousStrokes, stroke]);
        setIsTyping(true);
        onTypingActivity?.(true);
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setIsTyping(false), 650);

        if (stroke.errors > 0) {
          setWrongFlash((prev) => ({ key: stroke.key, seq: (prev?.seq ?? 0) + 1 }));
          clearTimeout(wrongTimer.current);
          wrongTimer.current = setTimeout(() => setWrongFlash(null), 600);
        } else {
          setWrongFlash(null);
        }
      }
      onInput(value);
    },
    [current, session.index, session.input, onInput, onTypingActivity],
  );

  const typeRef = useRef(type);
  typeRef.current = type;
  const inputValueRef = useRef(session.input);
  inputValueRef.current = session.input;

  // Pressing a plain letter while focused on non-text chrome snaps focus back and submits immediately.
  useEffect(() => {
    if (session.done || isReplaying) return;
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
      typeRef.current(inputValueRef.current + event.key.toLowerCase());
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [session.done, isReplaying]);

  function toggleReplay() {
    if (isReplaying) {
      setReplayTime(null);
      setReplayFinished(false);
    } else {
      setReplayFinished(false);
      setReplayTime(performance.now());
    }
  }

  const showFocusVeil = !focused && !session.done && !isReplaying;
  const trackIndex = isReplaying ? ghostMark.index : session.done ? 0 : session.index;
  const trackShift = layout ? rowShiftForGlyph(layout, trackIndex) : 0;
  const viewportHeight = layout ? viewportHeightForRows(layout, 3) : null;

  return (
    <div className="mt-shadow-stage">
      {session.done && (
        <ShadowResults
          title={article.title}
          strokes={strokes}
          previous={previous?.strokes}
          isReplaying={isReplaying}
          saveFailed={saveFailed}
          themeKey={themeKey}
          next={
            next && {
              title: next.title,
              label: course ? "下一句" : undefined,
              onClick: () => onArticle(next.id),
            }
          }
          onRestart={onRestart}
          onReplay={toggleReplay}
        />
      )}

      <div className="mt-config-bar mt-chrome-fade" role="toolbar" aria-label="跟打配置">
        {course && sentence ? (
          <div className="mt-bar-heading">
            <h2 className="mt-bar-title">{course.label}短句</h2>
            <span className="mt-bar-stat tabular-nums">
              本排击键 {sentence.hits} / {sentence.total} (
              {Math.round((sentence.hits / sentence.total) * 100)}%)
            </span>
          </div>
        ) : (
          <ShadowArticlePicker
            article={article}
            completed={completed}
            onChoose={onArticle}
            typingInput={inputRef}
          />
        )}

        {!session.done && !course && (
          <>
            <span className="mt-bar-sep" aria-hidden="true" />
            <label className="mt-pace-control" data-active={guide !== "off" || undefined}>
              <span className="mt-pace-label">影子节奏</span>
              <span className="mt-select-shell">
                {/* Native select preserves OS picker UX on touch devices and user.selectOptions tests. */}
                <select
                  className="shadow-select"
                  value={guide}
                  onChange={(event) => {
                    setGuide(event.target.value);
                    if (replayTime !== null) {
                      setReplayTime(null);
                      setReplayFinished(false);
                    }
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                >
                  <option value="off">关闭</option>
                  {previous && <option value="last">上次记录</option>}
                  {[30, 60, 90].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate} 字/分
                    </option>
                  ))}
                </select>
                <svg
                  className="mt-select-chevron"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
                </svg>
              </span>
            </label>
          </>
        )}

        {course && next && !session.done && (
          <>
            <span className="mt-bar-sep" aria-hidden="true" />
            <Button data-variant="ghost" className="mt-bar-btn" onClick={() => onArticle(next.id)}>
              换一句
            </Button>
          </>
        )}

        {replay && startTime === null && !session.done && (
          <>
            <span className="mt-bar-sep" aria-hidden="true" />
            <Button data-variant="ghost" className="mt-bar-btn" onClick={toggleReplay}>
              {isReplaying ? "停止回放" : "回放上次"}
            </Button>
          </>
        )}
      </div>

      <div className="mt-arena-body mt-shadow-arena" data-replaying={isReplaying || undefined}>
        <ShadowLiveMetrics
          index={session.index}
          total={session.items.length}
          done={session.done}
          result={result}
          clockStart={clockStart}
          clockLimit={clockLimit}
          isReplay={isReplaying}
        />

        <div className="mt-passage-wrap" data-blurred={showFocusVeil || undefined}>
          <Input
            id={inputId}
            ref={inputRef}
            aria-label={course ? "盲打短句输入" : "影子跟打输入"}
            className="shadow-input"
            value={session.input}
            onFocus={(event) => {
              setFocused(true);
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
              setFocused(false);
            }}
            onKeyDown={(event) => {
              if (
                !event.nativeEvent.isComposing &&
                event.key !== "Process" &&
                event.keyCode !== 229
              ) {
                composing.current = false;
              }
            }}
            onValueChange={(value, details) => {
              const nativeEvent = details.event;
              if (nativeEvent && "isComposing" in nativeEvent && !nativeEvent.isComposing) {
                composing.current = false;
              }
              const normalized = value.toLowerCase();
              if (
                !current ||
                normalized === current.answer ||
                !current.answer.startsWith(normalized)
              ) {
                details.cancel();
              }
              type(value);
            }}
            onPaste={(event) => event.preventDefault()}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              if (/^[a-z]+$/i.test(event.data)) type(session.input + event.data);
              else if (/[^a-z]/i.test(event.data)) onInput(event.data);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={2}
            disabled={session.done}
          />
          <div
            className="mt-passage-viewport"
            style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
          >
            <label
              ref={passageRef}
              htmlFor={inputId}
              className="shadow-passage"
              style={
                trackShift > 0 ? { transform: `translate3d(0, -${trackShift}px, 0)` } : undefined
              }
            >
              <ShadowPassageGlyphs
                text={article.text}
                displayedIndex={displayedIndex}
                sessionIndex={session.index}
                sessionDone={session.done}
                hasError={!!session.error}
                inputLength={session.input.length}
                wrongSeq={wrongFlash?.seq ?? 0}
                replayActive={isReplaying}
                ghostIndex={ghostMark.index}
                ghostOffset={ghostMark.offset}
                ghostErrors={!!ghostMark.errors}
                showGhost={showGhost}
              />
              {showGhost && ghostMark.index === session.items.length && (
                <span
                  aria-hidden="true"
                  className="shadow-end"
                  data-glyph={session.items.length}
                  data-shadow-caret="0"
                />
              )}
              {!session.done && !isReplaying && (
                <PassageCaret
                  index={session.index}
                  offset={session.input.length}
                  typing={isTyping}
                  error={!!session.error}
                  resetKey={article.id}
                  layout={layout}
                />
              )}
              {showGhost && (
                <i
                  ref={ghostCaretRef}
                  data-index={ghostMark.index}
                  data-offset={ghostMark.offset}
                  className="passage-caret ghost-caret"
                  aria-hidden="true"
                />
              )}
            </label>
          </div>
          {showFocusVeil && (
            <button
              type="button"
              className="mt-focus-veil"
              tabIndex={-1}
              onClick={() => inputRef.current?.focus({ preventScroll: true })}
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m4 4 7 17 2.5-7.5L21 11z" />
              </svg>
              点击此处或按字母键继续输入
            </button>
          )}
        </div>

        <div className="mt-hud-row">
          {!session.done && current && (
            <div className="mt-active-hud">
              <span className="mt-hud-glyph">{current.han}</span>
              {pinyinHints && current.py && <span className="mt-hud-py">{current.py}</span>}
              <span className="mt-key-slots" aria-hidden="true">
                <kbd
                  className="mt-key-slot"
                  data-filled={!!session.input[0] || undefined}
                  data-wrong={wrongFlash && !session.input[0] ? "true" : undefined}
                >
                  {session.input[0]?.toUpperCase() ?? (wrongFlash ? wrongFlash.key : "·")}
                </kbd>
                <kbd
                  className="mt-key-slot"
                  data-wrong={wrongFlash && !!session.input[0] ? "true" : undefined}
                >
                  {session.input[1]?.toUpperCase() ?? "·"}
                </kbd>
              </span>
            </div>
          )}

          {showGhost && (
            <span className="mt-ghost-hud">
              <span aria-hidden="true" className="mt-ghost-swatch" />
              {pace ? `配速 ${pace} 字/分` : !isReplaying ? "上次记录" : "回放中"}
              {ghostMark.key && (
                <kbd className={ghostMark.errors ? "mt-kbd-error" : "mt-kbd-ghost"}>
                  {ghostMark.key}
                </kbd>
              )}
            </span>
          )}

          {!course && !previous && !session.done && !pace && (
            <span className="mt-hud-hint mt-chrome-fade">完成本篇即可与自己的记录同屏跟打</span>
          )}
        </div>

        <p
          className={session.error ? "mt-status-line" : "mt-status-line mt-chrome-fade"}
          role="status"
          data-error={!!session.error || undefined}
        >
          {session.error || (!session.done && "英文键盘输入双拼 · 标点自动跳过")}
        </p>

        {!session.done && (
          <div className="mt-restart-row">
            <Button data-variant="ghost" className="mt-restart-btn" onClick={onRestart}>
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {course ? "重打本句" : "重打这篇"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
