import { expect, test } from "vite-plus/test";
import { SpeechCoach } from "./speech";
import { utterances, voices } from "./test/setup";

test("Mandarin and contextual polyphone reading preserve rate and language", () => {
  expect(SpeechCoach.speak({ han: "行", py: "hang" }, 0.65)).toBe(true);
  expect(utterances.at(-1)).toMatchObject({ text: "银行，第二个字。", lang: "zh-CN", rate: 0.65 });
  expect(SpeechCoach.textFor({ han: "长", py: "chang" })).toBe("长短，第一个字。");
  expect(SpeechCoach.textFor({ han: "秋", py: "qiu" })).toBe("秋");
  SpeechCoach.stop();
});
test("cancellation prevents stale callbacks changing the current speech status", () => {
  SpeechCoach.speak({ han: "秋", py: "qiu" });
  const old = utterances.at(-1)!;
  SpeechCoach.speak({ han: "天", py: "tian" });
  old.onend?.(new Event("end") as SpeechSynthesisEvent);
  expect(SpeechCoach.snapshot().status).toBe("speaking");
  SpeechCoach.stop();
  old.onerror?.({ error: "network" } as SpeechSynthesisErrorEvent);
  expect(SpeechCoach.snapshot().status).toBe("idle");
});
test("missing Mandarin voice and browser permission errors give actionable fallback", () => {
  const saved = voices.splice(0);
  try {
    SpeechCoach.refresh();
    expect(SpeechCoach.snapshot().available).toBe(false);
    expect(SpeechCoach.speak({ han: "秋", py: "qiu" })).toBe(false);
    expect(SpeechCoach.snapshot().message).toContain("没有可用的普通话语音");
  } finally {
    voices.push(...saved);
    SpeechCoach.refresh();
  }
  SpeechCoach.speak({ han: "秋", py: "qiu" });
  utterances.at(-1)!.onerror?.({ error: "not-allowed" } as SpeechSynthesisErrorEvent);
  expect(SpeechCoach.snapshot().message).toContain("自动朗读被浏览器拦截");
  SpeechCoach.stop();
});
