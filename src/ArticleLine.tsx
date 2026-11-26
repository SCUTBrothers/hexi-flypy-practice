import { useLayoutEffect, useRef } from "react";
import { PassageCaret } from "./PassageCaret";

export function ArticleLine({
  text,
  index,
  offset,
  listenOnly,
}: {
  text: string;
  index: number;
  offset: number;
  listenOnly: boolean;
}) {
  const strip = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>("[data-current]");
    if (el && active)
      el.scrollTop = Math.max(0, active.offsetTop - el.clientHeight / 2 + active.offsetHeight / 2);
  }, [index]);
  let count = 0;
  return (
    <p ref={strip} className="article-line">
      {Array.from(text, (character, position) => {
        const isHan = /[\u3400-\u9fff]/.test(character);
        const i = count;
        if (isHan) count++;
        return (
          <span
            key={position}
            data-glyph={isHan ? i : undefined}
            data-current={(isHan && i === index) || undefined}
            data-finished={i < index || undefined}
          >
            {listenOnly && isHan && i >= index ? "·" : character}
          </span>
        );
      })}
      <PassageCaret index={index} offset={offset} />
    </p>
  );
}
