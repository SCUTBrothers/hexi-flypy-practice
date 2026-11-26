import { useLayoutEffect, useRef } from "react";
import { PassageCaret } from "./PassageCaret";

export function ArticleLine({
  text,
  index,
  offset,
  listenOnly,
  typing = false,
  error = false,
}: {
  text: string;
  index: number;
  offset: number;
  listenOnly: boolean;
  typing?: boolean;
  error?: boolean;
}) {
  const strip = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>("[data-current]");
    if (el && active) {
      el.scrollTop = Math.max(0, active.offsetTop - el.clientHeight / 2 + active.offsetHeight / 2);
    }
  }, [index]);

  let count = 0;
  return (
    <p ref={strip} className="article-line">
      {Array.from(text, (character, position) => {
        const isHan = /[\u3400-\u9fff]/.test(character);
        const i = count;
        if (isHan) count++;
        const isCurrent = isHan && i === index;
        return (
          <span
            key={position}
            data-glyph={isHan ? i : undefined}
            data-current={isCurrent || undefined}
            data-half={isCurrent && offset > 0 ? "true" : undefined}
            data-error={isCurrent && error ? "true" : undefined}
            data-finished={i < index || undefined}
          >
            {listenOnly && isHan && i >= index ? "·" : character}
          </span>
        );
      })}
      <PassageCaret index={index} offset={offset} typing={typing} error={error} resetKey={text} />
    </p>
  );
}
