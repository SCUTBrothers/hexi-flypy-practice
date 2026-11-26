import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame";
import { ShadowArticlePicker } from "./ShadowArticlePicker";
import { ARTICLES } from "./data";
import type { Session } from "./practice";
import type { RowCourse } from "./row-course";
import { PassageCaret } from "./PassageCaret";
import { ShadowResults } from "./ShadowResults";
import {
  getResult,
  loadShadow,
  recordStroke,
  saveShadow,
  strokeAt,
  type Stroke,
} from "./shadow-record";

type Article = (typeof ARTICLES)[number];
const duration = (ms: number) => (ms / 1000).toFixed(1) + " 秒";
const articleGroups = [...new Set(ARTICLES.map((article) => article.tag))].map((tag) => ({
  tag,
  articles: ARTICLES.filter((article) => article.tag === tag),
}));
const articleOrder = articleGroups.flatMap(({ articles }) => articles);

function nextShadowArticle(id: string, completed: ReadonlySet<string>, order: Article[]) {
  const index = order.findIndex((article) => article.id === id);
  const following = [...order.slice(index + 1), ...order.slice(0, index)];
  return following.find((article) => !completed.has(article.id)) ?? following[0];
}

export function ShadowPractice({
  article,
  course,
  session,
  completed,
  pinyinHints,
  onInput,
  onArticle,
  onRestart,
}: {
  article: Article;
  course?: RowCourse;
  session: Session;
  completed: ReadonlySet<string>;
  pinyinHints: boolean;
  onInput: (value: string) => void;
  onArticle: (id: string) => void;
  onRestart: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const passageRef = useRef<HTMLLabelElement>(null);
  const composing = useRef(false);
  const firstInput = useRef<number | null>(null);
  const signature = article.text + "\n" + article.syllables;
  const [previous] = useState(() => loadShadow(article.id, signature));
  const [guide, setGuide] = useState(previous ? "last" : "off");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const current = session.items[session.index];
  const result = useMemo(() => getResult(strokes), [strokes]);
  const replay = session.done ? strokes : previous?.strokes;
  const replayDuration = replay?.at(-1)?.at ?? 0;
  const clockStart = replayTime ?? (session.done ? null : startTime);
  const clockLimit = replayTime === null ? Infinity : replayDuration;
  const isReplaying = replayTime !== null && elapsed < replayDuration;
  const ghost =
    clockStart !== null && replay && (replayTime !== null || guide === "last")
      ? strokeAt(replay, elapsed)
      : undefined;
  const pace = replayTime === null && !session.done ? Number(guide) || 0 : 0;
  const steps = Math.min(2 * session.items.length, Math.floor((elapsed * pace) / 30000));
  const showGhost =
    replayTime !== null || (!session.done && ((guide === "last" && !!previous) || pace > 0));
  const replayIndex = pace ? Math.floor(steps / 2) : (ghost?.index ?? 0);
  const ghostOffset = pace ? steps % 2 : (ghost?.offset ?? 0);
  const displayedIndex = replayTime !== null ? replayIndex : session.index;
  const speed =
    elapsed >= 1000 && session.index ? Math.round((session.index * 60000) / elapsed) : null;
  const next =
    session.done || course
      ? nextShadowArticle(article.id, completed, course?.sentences ?? articleOrder)
      : undefined;
  const sentence = course?.sentences.find((item) => item.id === article.id);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    passageRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    if (clockStart === null) return;
    const timer = window.setInterval(
      () => {
        const time = performance.now() - clockStart;
        setElapsed(Math.min(time, clockLimit));
        if (time >= clockLimit) window.clearInterval(timer);
      },
      showGhost ? 50 : 200,
    );
    return () => window.clearInterval(timer);
  }, [clockStart, clockLimit, showGhost]);

  useEffect(() => {
    if (!session.done) return;
    setSaveFailed(!saveShadow(article.id, { signature, strokes }));
  }, [article.id, session.done, signature, strokes]);

  useEffect(() => {
    const passage = passageRef.current;
    const glyph = passage?.querySelector<HTMLElement>(`[data-glyph="${displayedIndex}"]`);
    if (!passage || !glyph) return;
    const top = glyph.offsetTop;
    if (
      top < passage.scrollTop ||
      top + glyph.offsetHeight > passage.scrollTop + passage.clientHeight
    ) {
      passage.scrollTop = Math.max(0, top - passage.clientHeight / 3);
    }
  }, [displayedIndex]);

  function type(value: string) {
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
        setElapsed(0);
        setReplayTime(null);
      }
      setStrokes((previousStrokes) => [...previousStrokes, stroke]);
    }
    onInput(value);
  }
  function toggleReplay() {
    setReplayTime(isReplaying ? null : performance.now());
    setElapsed(0);
  }

  const glyphs = useMemo(() => {
    let index = 0;
    return Array.from(article.text, (character, position) => {
      if (!/[\u3400-\u9fff]/.test(character)) {
        return (
          <span key={position} data-state={index <= displayedIndex ? "done" : "waiting"}>
            {character}
          </span>
        );
      }
      const i = index++;
      const active = replayTime === null && i === session.index && !session.done;
      const isError =
        replayTime === null ? active && !!session.error : i === replayIndex && !!ghost?.errors;
      const state = i < displayedIndex ? "done" : isError ? "error" : "waiting";
      const caret = showGhost && replayIndex === i ? ghostOffset : undefined;
      return (
        <span
          key={position}
          data-glyph={i}
          data-state={state}
          data-active={active || undefined}
          data-shadow-caret={caret}
          aria-current={active ? "true" : undefined}
        >
          {character}
        </span>
      );
    });
  }, [
    article.text,
    displayedIndex,
    replayTime,
    session.index,
    session.done,
    session.error,
    replayIndex,
    ghost?.errors,
    showGhost,
    ghostOffset,
  ]);
  return (
    <div className="flex flex-col gap-5">
      {session.done && (
        <ShadowResults
          title={article.title}
          strokes={strokes}
          previous={previous?.strokes}
          isReplaying={isReplaying}
          saveFailed={saveFailed}
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
      <Frame className="min-w-0 [overflow-anchor:none]">
        <FrameHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {course && sentence ? (
              <div>
                <h2 className="text-lg font-semibold">{course.label}短句</h2>
                <p className="mt-1 text-sm text-stone-600">
                  本排击键 {sentence.hits} / {sentence.total} ·{" "}
                  {Math.round((sentence.hits / sentence.total) * 100)}%
                </p>
              </div>
            ) : (
              <ShadowArticlePicker
                article={article}
                completed={completed}
                onChoose={onArticle}
                typingInput={inputRef}
              />
            )}
            <div className="shadow-actions">
              {!session.done && !course && (
                <label className="guide-label">
                  影子节奏
                  {/* The short pace list uses the device picker and returns directly to typing. */}
                  <select
                    className="shadow-select"
                    value={guide}
                    onChange={(event) => {
                      setGuide(event.target.value);
                      if (replayTime !== null) {
                        setReplayTime(null);
                        setElapsed(0);
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
                </label>
              )}
              {course && next && !session.done && (
                <Button onClick={() => onArticle(next.id)}>换一句</Button>
              )}
              {replay && startTime === null && !session.done && (
                <Button onClick={toggleReplay}>{isReplaying ? "停止回放" : "回放上次"}</Button>
              )}
              {!session.done && (
                <Button data-variant="ghost" onClick={onRestart}>
                  {course ? "重打本句" : "重打这篇"}
                </Button>
              )}
            </div>
          </div>
        </FrameHeader>
        <FramePanel>
          <div className="stroke-metrics">
            <span>
              {session.index} / {session.items.length} 字
            </span>
            {replayTime === null && (
              <>
                <span>
                  <b>{session.done ? result.speed : (speed ?? "—")}</b> 字/分
                </span>
                <span>
                  击键准确率 <b>{result.keys ? Math.round(result.accuracy) + "%" : "—"}</b>
                </span>
              </>
            )}
            <span>
              {replayTime !== null ? "回放" : "用时"}{" "}
              {duration(replayTime !== null ? elapsed : session.done ? result.elapsed : elapsed)}
            </span>
          </div>
          <div className="relative mt-4">
            <Input
              id={inputId}
              ref={inputRef}
              aria-label={course ? "盲打短句输入" : "影子跟打输入"}
              className="shadow-input"
              value={session.input}
              onValueChange={(value, details) => {
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
                if (/[^a-z]/i.test(event.data)) onInput(event.data);
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={2}
              disabled={session.done}
            />
            <label ref={passageRef} htmlFor={inputId} className="shadow-passage">
              {glyphs}
              {showGhost && replayIndex === session.items.length && (
                <span
                  aria-hidden="true"
                  className="shadow-end"
                  data-glyph={session.items.length}
                  data-shadow-caret="0"
                />
              )}
              {!session.done && replayTime === null && (
                <PassageCaret index={session.index} offset={session.input.length} />
              )}
              {showGhost && <PassageCaret index={replayIndex} offset={ghostOffset} ghost />}
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
            {!session.done && current && (
              <span>
                正在输入 <strong>{current.han}</strong>
                {pinyinHints && current.py ? " · " + current.py : ""}
                {session.input && <kbd className="ml-2">{session.input.toUpperCase()}</kbd>}
              </span>
            )}
            {showGhost && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-0.5 rounded bg-rose-600" />
                {pace
                  ? `配速 ${pace} 字/分`
                  : replayTime === null
                    ? "上次的影子"
                    : "回放 " + duration(elapsed)}
                {ghost && <kbd className={ghost.errors ? "text-destructive" : ""}>{ghost.key}</kbd>}
              </span>
            )}
            {!course && !previous && !session.done && !pace && (
              <span>完成本篇即可与自己的记录跟打。</span>
            )}
          </div>
          <p className="mt-3 min-h-5 text-sm text-stone-600" role="status">
            {session.error || (!session.done && "用英文键盘输入双拼，标点自动跳过。")}
          </p>
        </FramePanel>
      </Frame>
    </div>
  );
}
