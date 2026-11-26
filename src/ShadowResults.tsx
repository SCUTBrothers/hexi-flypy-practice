import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { getResult, type Stroke } from "./shadow-record";
import { buildTimeline, nearestError, paceAt } from "./shadow-timeline";

const colors = {
  current: "#17674e",
  previous: "#986326",
  error: "#ba3651",
  text: "#53665c",
  grid: "#dce8df",
};
const seconds = (ms: number) => (ms / 1000).toFixed(1) + " 秒";
const percentage = (value: number) => value.toFixed(1) + "%";
type Timeline = ReturnType<typeof buildTimeline>;

function drawTimeline(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Timeline,
  selected: number,
  speed: number | null,
  previousSpeed: number | null,
) {
  const left = 43;
  const right = width - 17;
  const top = 13;
  const bottom = height - 36;
  const x = (at: number) => left + ((right - left) * at) / data.duration;
  const y = (value: number) => bottom - ((bottom - top) * value) / data.maxSpeed;
  context.clearRect(0, 0, width, height);
  context.font = "11px system-ui, sans-serif";
  context.lineWidth = 1;
  context.strokeStyle = colors.grid;
  context.fillStyle = colors.text;
  context.textBaseline = "middle";
  context.textAlign = "right";
  for (let i = 0; i <= 3; i++) {
    const value = (i * data.maxSpeed) / 3;
    context.fillText(String(value), left - 8, y(value));
    context.beginPath();
    context.moveTo(left, y(value));
    context.lineTo(right, y(value));
    context.stroke();
  }
  const ticks = width < 380 ? 2 : 4;
  for (let i = 0; i <= ticks; i++) {
    const at = (data.duration * i) / ticks;
    context.textAlign = i === 0 ? "left" : i === ticks ? "right" : "center";
    context.fillText(`${+(at / 1000).toFixed(1)}s`, x(at), height - 8);
  }

  function line(points: Timeline["current"], color: string, dashed: boolean) {
    if (!points.length) return;
    context.beginPath();
    points.forEach(({ at, speed: value }, index) => {
      if (index === 0) context.moveTo(x(at), y(value));
      else context.lineTo(x(at), y(value));
    });
    if (!dashed) {
      const fill = context.createLinearGradient(0, top, 0, bottom);
      fill.addColorStop(0, "#459c7633");
      fill.addColorStop(1, "#459c7608");
      context.save();
      context.lineTo(x(points.at(-1)!.at), bottom);
      context.lineTo(x(points[0].at), bottom);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      context.restore();
      context.beginPath();
      points.forEach(({ at, speed: value }, index) => {
        if (index === 0) context.moveTo(x(at), y(value));
        else context.lineTo(x(at), y(value));
      });
    }
    context.strokeStyle = color;
    context.lineWidth = dashed ? 1.8 : 2.6;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.setLineDash(dashed ? [6, 5] : []);
    context.stroke();
    context.setLineDash([]);
  }
  line(data.current, colors.current, false);
  line(data.previous, colors.previous, true);

  const cursor = x(selected);
  context.beginPath();
  context.moveTo(cursor, top);
  context.lineTo(cursor, bottom + 11);
  context.strokeStyle = "#718a7d";
  context.lineWidth = 1;
  context.stroke();

  function dot(px: number, py: number, color: string, radius: number) {
    context.beginPath();
    context.arc(px, py, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "#fbfdf9";
    context.lineWidth = 1.5;
    context.stroke();
  }
  for (const at of data.errors) dot(x(at), bottom + 11, colors.error, 3.7);
  if (previousSpeed !== null) dot(cursor, y(previousSpeed), colors.previous, 4);
  if (speed !== null) dot(cursor, y(speed), colors.current, 4.5);
}

function ResultChart({ current, previous }: { current: Stroke[]; previous?: Stroke[] }) {
  const titleId = useId();
  const readoutId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = useMemo(() => buildTimeline(current, previous), [current, previous]);
  const currentEnd = current.at(-1)?.at ?? 0;
  const [selected, setSelected] = useState(currentEnd);
  const speed = paceAt(current, selected);
  const previousSpeed = previous ? paceAt(previous, selected) : null;
  const error = nearestError(current, selected, Math.max(120, data.duration / 90));
  const step = Math.max(1, Math.round(data.duration / 90));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width < 70 || height < 70) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.scale(ratio, ratio);
      drawTimeline(context, width, height, data, selected, speed, previousSpeed);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [data, selected, speed, previousSpeed]);

  return (
    <section className="result-chart" aria-labelledby={titleId}>
      <div className="result-chart-head">
        <div>
          <h3 id={titleId} className="font-semibold">
            字速变化
          </h3>
          <p className="mt-1 text-sm text-stone-600">最近 4 秒的平均字速 · 字/分</p>
        </div>
        <ul className="result-legend" aria-label="图例">
          <li data-series="current">本轮</li>
          {previous && <li data-series="previous">上次</li>}
          <li data-series="error">本轮错键</li>
        </ul>
      </div>
      <div className="result-chart-plot">
        <canvas ref={canvasRef} aria-hidden="true" />
        <input
          aria-label="图表时间"
          aria-describedby={readoutId}
          aria-valuetext={
            seconds(selected) + (speed === null ? "，本轮已结束" : `，本轮 ${speed} 字每分`)
          }
          type="range"
          min={0}
          max={data.duration}
          step="any"
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
            setSelected(Math.round(fraction * data.duration));
          }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) return;
            event.preventDefault();
            const forward = event.key === "ArrowRight" || event.key === "ArrowUp";
            setSelected((time) =>
              Math.max(0, Math.min(data.duration, time + (forward ? step : -step))),
            );
          }}
        />
      </div>
      <div className="result-chart-readout" id={readoutId}>
        <strong className="tabular-nums">{seconds(selected)}</strong>
        <span>
          本轮 <b>{speed === null ? "—" : speed + " 字/分"}</b>
        </span>
        {previous && (
          <span>
            上次 <b>{previousSpeed === null ? "—" : previousSpeed + " 字/分"}</b>
          </span>
        )}
        {error && (
          <span className="text-rose-800">
            附近错键 <kbd>{error.key}</kbd>
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-stone-600">
        移动鼠标或点按图表查看对应时刻，也可用方向键调整。
      </p>
    </section>
  );
}

type Summary = ReturnType<typeof getResult>;
const resultRows: [string, (value: Summary) => string | number][] = [
  ["用时", (value) => seconds(value.elapsed)],
  ["速度", (value) => value.speed + " 字/分"],
  ["按键准确率", (value) => percentage(value.accuracy)],
  ["完成汉字", (value) => value.characters],
  ["按错次数", (value) => value.errors],
  ["参与判定的按键", (value) => value.keys],
];

export function ShadowResults({
  title,
  strokes,
  previous,
  isReplaying,
  saveFailed,
  next,
  onRestart,
  onReplay,
}: {
  title: string;
  strokes: Stroke[];
  previous?: Stroke[];
  isReplaying: boolean;
  saveFailed: boolean;
  next?: { title: string; label?: string; onClick: () => void };
  onRestart: () => void;
  onReplay: () => void;
}) {
  const headingId = useId();
  const nextTitleId = useId();
  const resultRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const current = getResult(strokes);
  const last = previous ? getResult(previous) : null;
  const delta = last ? current.speed - last.speed : 0;
  const speedChange =
    delta === 0 ? "与上次字速相同" : `比上次${delta > 0 ? "快" : "慢"} ${Math.abs(delta)} 字/分`;
  return (
    <section
      ref={resultRef}
      className="panel shadow-results scroll-mt-4"
      aria-labelledby={headingId}
    >
      <header className="result-header">
        <div>
          <h2 id={headingId} className="text-xl font-semibold">
            跟打统计
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {title} · {current.characters} 字
          </p>
        </div>
        <div className="grid gap-2 sm:justify-items-end">
          <div className="flex flex-wrap gap-2">
            {next && (
              <Button
                ref={nextRef}
                data-variant="solid"
                aria-describedby={nextTitleId}
                onClick={next.onClick}
              >
                {next.label ?? "下一篇"}
                <kbd aria-hidden="true" className="ml-2 hidden text-xs opacity-80 sm:inline">
                  Enter
                </kbd>
              </Button>
            )}
            <Button onClick={onRestart}>再跟打一轮</Button>
            <Button data-variant="ghost" onClick={onReplay}>
              {isReplaying ? "停止回放" : "回放本轮"}
            </Button>
          </div>
          {next && (
            <p id={nextTitleId} className="text-sm text-stone-600">
              接下来练《{next.title}》
            </p>
          )}
        </div>
      </header>
      <dl className="result-scoreboard">
        <div className="result-score result-score-primary">
          <dt>平均字速</dt>
          <dd>
            <strong>{current.speed}</strong> <span>字/分</span>
            {last && <span className="result-comparison">{speedChange}</span>}
          </dd>
        </div>
        <div className="result-score">
          <dt>按键准确率</dt>
          <dd>
            <strong>{percentage(current.accuracy)}</strong>
            {last && <span className="result-comparison">上次 {percentage(last.accuracy)}</span>}
          </dd>
        </div>
        <div className="result-score">
          <dt>用时</dt>
          <dd>
            <strong>{(current.elapsed / 1000).toFixed(1)}</strong> <span>秒</span>
            {last && <span className="result-comparison">上次 {seconds(last.elapsed)}</span>}
          </dd>
        </div>
        <div className="result-score">
          <dt>按错次数</dt>
          <dd>
            <strong>{current.errors}</strong> <span>次</span>
            {last && <span className="result-comparison">上次 {last.errors} 次</span>}
          </dd>
        </div>
      </dl>
      <ResultChart current={strokes} previous={previous} />
      <details className="result-details">
        <summary>展开成绩明细</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">指标</th>
              <th scope="col">本轮</th>
              <th scope="col">上次</th>
            </tr>
          </thead>
          <tbody>
            {resultRows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value(current)}</td>
                <td>{last ? value(last) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {saveFailed && (
        <p role="status" className="text-sm text-rose-800">
          当前浏览器无法保存影子记录。
        </p>
      )}
    </section>
  );
}
