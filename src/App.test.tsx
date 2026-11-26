import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/react/agent";
import { expect, test } from "vite-plus/test";
import App from "./App";
import { ARTICLES, encode } from "./data";
import { createSession, freshProgress, STORAGE } from "./practice";
import { engine, utterances, voices } from "./test/setup";
import { SpeechCoach } from "./speech";

const agent = createAgent();
const input = () => screen.getByLabelText<HTMLInputElement>("双拼输入");
test("shadow typing marks the sentence in place, saves the run and compares results on restart", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: "影子跟打" }));
  const field = screen.getByRole("textbox", { name: "影子跟打输入" });
  const active = () => view.container.querySelector(".shadow-passage [aria-current]");
  expect(field).toBe(document.activeElement);
  expect(screen.getByText(`已练习 0 / ${ARTICLES.length} 篇`)).toBeTruthy();
  expect(screen.getByRole("button", { name: "切换跟打文章，当前《慢慢来，也很好》" })).toBeTruthy();
  expect(screen.getByText("未练习")).toBeTruthy();
  expect(active()).toHaveProperty("textContent", "每");
  expect(active()?.getAttribute("data-state")).toBe("waiting");
  expect(view.container.querySelector(".shadow-passage")?.textContent).toBe(
    "每天练习一点，让双手慢慢记住。",
  );
  await user.keyboard("mz");
  expect(active()?.getAttribute("data-state")).toBe("error");
  expect(active()).toHaveProperty("textContent", "每");
  const keys = createSession("shadow")
    .items.map((item) => item.answer)
    .join("");
  await user.keyboard(keys);
  expect(screen.getByRole("heading", { name: "跟打统计" })).toBeTruthy();
  const timeline = screen.getByRole("slider", { name: "图表时间" });
  const end = Number(
    timeline.getAttribute("aria-valuenow") ?? (timeline as HTMLInputElement).value,
  );
  timeline.focus();
  await user.keyboard("{ArrowLeft}");
  expect(Number((timeline as HTMLInputElement).value)).toBeLessThan(end);
  await user.click(screen.getByText("展开成绩明细"));
  expect(screen.getByRole("row", { name: /按错次数 1/ })).toBeTruthy();
  expect(screen.getByRole("row", { name: /完成汉字 13/ })).toBeTruthy();
  expect(screen.getByText(`已练习 1 / ${ARTICLES.length} 篇`)).toBeTruthy();
  expect(screen.getByText("已练习", { exact: true })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "再跟打一轮" }));
  expect(screen.getByRole("button", { name: "回放上次" })).toBeTruthy();
  expect(view.container.querySelector("[data-shadow-caret]")?.textContent).toBe("每");
  await user.keyboard("mw");
  expect(view.container.querySelector(".shadow-passage [data-state=done]")?.textContent).toBe("每");
  expect(active()).toHaveProperty("textContent", "天");
  await user.keyboard(keys.slice(2));
  await user.click(screen.getByText("展开成绩明细"));
  expect(screen.getByRole("row", { name: "按错次数 0 1" })).toBeTruthy();
  expect(screen.getByRole("list", { name: "图例" }).textContent).toContain("上次");
  expect(screen.getByRole("button", { name: "回放本轮" })).toBeTruthy();
  expect(screen.getByText(`已练习 1 / ${ARTICLES.length} 篇`)).toBeTruthy();
  expect(screen.getByText("接下来练《早餐时间》")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "下一篇" }));
  expect(screen.queryByRole("heading", { name: "跟打统计" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "影子跟打输入" })).toBe(document.activeElement);
  expect(active()).toHaveProperty("textContent", "我");
  view.unmount();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "文章练习" }));
  expect(screen.getByText(`已练习 1 / ${ARTICLES.length} 篇`)).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "慢慢来，也很好" }).closest("article")?.textContent,
  ).toContain("已练习");
});
test("continuing a shadow round by keyboard skips articles already practised", async () => {
  localStorage.setItem(
    STORAGE,
    JSON.stringify({ ...freshProgress(), articleCompletion: { breakfast: { shadow: true } } }),
  );
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: "影子跟打" }));
  await user.keyboard(
    createSession("shadow")
      .items.map((item) => item.answer)
      .join(""),
  );
  expect(screen.getByText("接下来练《等公交》")).toBeTruthy();
  expect(screen.getByRole("button", { name: "下一篇" })).toBe(document.activeElement);
  expect(agent.snapshot().some((entry) => entry.label === "下一篇")).toBe(true);
  await user.keyboard("{Enter}wo");
  expect(screen.getByRole("textbox", { name: "影子跟打输入" })).toBe(document.activeElement);
  expect(view.container.querySelector(".shadow-passage [aria-current]")?.textContent).toBe("在");
  expect(screen.getByText(`已练习 2 / ${ARTICLES.length} 篇`)).toBeTruthy();
});
test("a device without Mandarin keeps visual practice usable and disables listening", async () => {
  const saved = voices.splice(0);
  try {
    SpeechCoach.refresh();
    render(<App />);
    expect(screen.getByRole("radio", { name: "听音练习" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(screen.getByTestId("question")).toBeTruthy();
    expect(screen.getByText(/未检测到普通话语音/)).toBeTruthy();
  } finally {
    voices.push(...saved);
    await act(async () => {
      SpeechCoach.refresh();
    });
  }
});
test("all SDK controls are named and agent actions change real state", async () => {
  render(<App />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  const components = agent.snapshot().filter((x) => !x.offPage && x.component !== "more");
  for (const entry of components)
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
  const labels = components.map((x) => x.label);
  for (const name of [
    "双拼输入",
    "练习类型",
    "答案提示",
    "声韵母提示",
    "拼音提示",
    "自动朗读",
    "题目呈现",
    "朗读速度",
    "本轮完成进度",
  ])
    expect(labels).toContain(name);
  const answer = encode(screen.getByTestId("pinyin").textContent!);
  await act(async () => {
    const result = await agent.act({
      steps: [
        { ref: "答案提示", action: "setChecked", args: [true] },
        { ref: "声韵母提示", action: "setChecked", args: [false] },
        { ref: "拼音提示", action: "setChecked", args: [false] },
      ],
    });
    expect(result.ok, result.error?.message).toBe(true);
  });
  expect(screen.getByRole("switch", { name: "答案提示" }).getAttribute("aria-checked")).toBe(
    "true",
  );
  expect(screen.queryByTestId("sound-hints")).toBeNull();
  expect(screen.queryByTestId("pinyin")).toBeNull();
  await act(async () => {
    const result = await agent.act({
      steps: [{ ref: "双拼输入", action: "setValue", args: [answer] }],
    });
    expect(result.ok, result.error?.message).toBe(true);
  });
  expect(screen.getByText("上一题")).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(STORAGE)!).correct).toBe(1);
});
test("sound hints toggle independently by keyboard and persist across rounds and reloads", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  const control = screen.getByRole("switch", { name: "声韵母提示" });
  expect(screen.getByTestId("sound-hints")).toBeTruthy();
  control.focus();
  await user.keyboard(" ");
  expect(control.getAttribute("aria-checked")).toBe("false");
  expect(screen.queryByTestId("sound-hints")).toBeNull();
  expect(screen.getByTestId("pinyin").textContent).toBeTruthy();
  expect(screen.getByRole("switch", { name: "答案提示" }).getAttribute("aria-checked")).toBe(
    "false",
  );
  await user.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.queryByTestId("sound-hints")).toBeNull();
  view.unmount();
  render(<App />);
  expect(screen.getByRole("switch", { name: "声韵母提示" }).getAttribute("aria-checked")).toBe(
    "false",
  );
  await user.click(screen.getByRole("switch", { name: "声韵母提示" }));
  expect(screen.getByTestId("sound-hints")).toBeTruthy();
  await user.click(screen.getByRole("radio", { name: "听音练习" }));
  expect(screen.queryByTestId("sound-hints")).toBeNull();
  await user.click(screen.getByRole("button", { name: "查看题目提示" }));
  expect(screen.getByTestId("sound-hints")).toBeTruthy();
});
test("pinyin hints work independently, persist, and preserve older sound hint preferences", async () => {
  localStorage.setItem("hexi-display-v1", JSON.stringify({ soundHints: false }));
  const user = userEvent.setup();
  const view = render(<App />);
  const code = encode(screen.getByTestId("pinyin").textContent!);
  expect(screen.queryByTestId("sound-hints")).toBeNull();
  const toggle = screen.getByRole("switch", { name: "拼音提示" });
  toggle.focus();
  await user.keyboard(" ");
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(screen.queryByTestId("pinyin")).toBeNull();
  expect(screen.getByTestId("question").textContent).toBeTruthy();
  await user.click(screen.getByRole("switch", { name: "声韵母提示" }));
  expect(screen.getByTestId("sound-hints")).toBeTruthy();
  expect(screen.queryByTestId("pinyin")).toBeNull();
  await user.type(input(), code);
  expect(screen.getByText("上一题")).toBeTruthy();
  expect(screen.queryByTestId("pinyin")).toBeNull();
  expect(JSON.parse(localStorage.getItem("hexi-display-v1")!)).toEqual({
    soundHints: true,
    pinyinHints: false,
  });
  view.unmount();
  render(<App />);
  expect(screen.queryByTestId("pinyin")).toBeNull();
  expect(screen.getByTestId("sound-hints")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.queryByTestId("pinyin")).toBeNull();
  await user.click(screen.getByRole("switch", { name: "拼音提示" }));
  expect(screen.getByTestId("pinyin").textContent).toBeTruthy();
  await user.click(screen.getByRole("radio", { name: "听音练习" }));
  expect(screen.queryByTestId("pinyin")).toBeNull();
});
test("two-key input keeps focus, wrong input enters notebook and IME does not count", async () => {
  const user = userEvent.setup();
  render(<App />);
  const py = screen.getByTestId("pinyin").textContent!;
  const code = encode(py);
  await user.type(input(), code[0]);
  expect(screen.queryByText("上一题")).toBeNull();
  await user.type(input(), code[1]);
  expect(screen.getByText("上一题")).toBeTruthy();
  expect(document.activeElement).toBe(input());
  fireEvent.compositionStart(input());
  fireEvent.change(input(), { target: { value: "中文" } });
  fireEvent.compositionEnd(input());
  expect(screen.getByText("请切换到英文输入法，输入字母。")).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(STORAGE)!).attempts).toBe(1);
  const next = encode(screen.getByTestId("pinyin").textContent!);
  await user.type(input(), next[0] === "z" ? "a" : "z");
  await user.click(screen.getByRole("button", { name: /错题本/ }));
  expect(screen.getByText("1 道待复习")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "开始错题复习" }));
  expect(input()).toBeTruthy();
});
test("keyboard toggles, pause and dialog restore focus", async () => {
  const user = userEvent.setup();
  render(<App />);
  for (const label of ["答案提示", "自动朗读"]) {
    const control = screen.getByRole("switch", { name: label });
    control.focus();
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("false");
  }
  await user.click(screen.getByRole("button", { name: "暂停练习" }));
  expect(input().disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "继续练习" }));
  expect(input().disabled).toBe(false);
  const help = screen.getByRole("button", { name: /练习指南/ });
  await user.click(help);
  expect(screen.getByRole("dialog")).toBeTruthy();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(help));
  await user.click(help);
  await user.click(screen.getByRole("button", { name: "知道了，开始练习" }));
  await waitFor(() => expect(document.activeElement).toBe(help));
});
test("listen mode hides answer, reads once on each question and cancels on pause", async () => {
  const user = userEvent.setup();
  render(<App />);
  const py = screen.getByTestId("pinyin").textContent!;
  await user.click(screen.getByRole("radio", { name: "听音练习" }));
  expect(screen.queryByTestId("question")).toBeNull();
  await waitFor(() => expect(utterances).toHaveLength(1));
  expect(utterances[0].lang).toBe("zh-CN");
  expect(utterances[0].rate).toBe(0.8);
  await user.type(input(), encode(py));
  await waitFor(() => expect(utterances).toHaveLength(2));
  await user.click(screen.getByRole("button", { name: "重听" }));
  expect(utterances).toHaveLength(3);
  input().focus();
  await user.keyboard(" ");
  expect(utterances).toHaveLength(4);
  await user.click(screen.getByRole("button", { name: "查看题目提示" }));
  expect(screen.getByTestId("question")).toBeTruthy();
  expect(utterances).toHaveLength(4);
  await user.click(screen.getByRole("button", { name: "暂停练习" }));
  expect(engine.cancel).toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "继续练习" }));
  expect(utterances).toHaveLength(5);
});
test("group, mapping, random, layout and article flows stay usable", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /上排 · 后五键/ }));
  expect("yuiop").toContain(encode(screen.getByTestId("pinyin").textContent!)[1]);
  await user.click(screen.getByRole("radio", { name: "韵母热身" }));
  expect(input().placeholder).toBe("输入韵母键");
  await user.click(screen.getByRole("button", { name: "键位速查" }));
  await user.click(screen.getByRole("button", { name: /^V 键/ }));
  expect(screen.getByText(/声母 zh/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "练习所在分组" }));
  expect(screen.getByRole("button", { name: /下排 · 前四键/ }).getAttribute("aria-current")).toBe(
    "step",
  );
  await user.click(screen.getByRole("button", { name: "随机练习" }));
  await user.click(screen.getByRole("button", { name: "开始拼字练习 · 30 题" }));
  expect(screen.getByText("1 / 30")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "文章练习" }));
  await user.click(screen.getByRole("button", { name: "练习《静夜思》" }));
  expect(screen.getByTestId("question").textContent).toBe("床");
  await user.type(input(), "il");
  expect(screen.getByTestId("question").textContent).toBe("前");
  await user.click(screen.getByRole("button", { name: "重新开始" }));
  expect(screen.getByTestId("question").textContent).toBe("床");
});
test("the grouped article catalog opens a longer passage and returns to the catalog", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "文章练习" }));
  for (const name of ["日常短句", "轻松散文", "古诗练习"]) {
    expect(screen.getByRole("heading", { name, level: 2 })).toBeTruthy();
  }
  await user.click(screen.getByRole("button", { name: "练习《沿河走到天黑》" }));
  expect(screen.getByTestId("question").textContent).toBe("傍");
  await user.type(input(), "bh");
  expect(screen.getByTestId("question").textContent).toBe("晚");
  await user.click(screen.getByRole("button", { name: "返回列表" }));
  expect(screen.getByRole("button", { name: "练习《竹里馆》" })).toBeTruthy();
  await user.click(screen.getByRole("radio", { name: "进阶长文" }));
  expect(screen.queryByRole("button", { name: "练习《竹里馆》" })).toBeNull();
  expect(screen.getByRole("button", { name: "练习《夜班公交》" })).toBeTruthy();
});
test("the notebook reports a wrong expected key and links to personalized random spelling", async () => {
  const user = userEvent.setup();
  render(<App />);
  const code = encode(screen.getByTestId("pinyin").textContent!);
  const wrong = code[1] === "z" ? "a" : "z";
  await user.type(input(), code[0] + wrong);
  await user.click(screen.getByRole("button", { name: /错题本/ }));
  expect(
    screen.getByRole("row", { name: new RegExp(code[1].toUpperCase() + " 韵母 1 / 1 100%") }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "去随机拼字" }));
  expect(screen.getByText("1 / 30")).toBeTruthy();
});

test("find a contrast passage and start a paced run with two key positions", async () => {
  const user = userEvent.setup();
  const { container } = render(<App />);
  await user.click(screen.getByRole("button", { name: "文章练习" }));
  const search = screen.getByRole("searchbox", { name: "搜索文章" });
  await user.type(search, "zzzz");
  await user.click(screen.getByRole("button", { name: "清除筛选" }));
  await user.type(search, "林间很静");
  await user.click(screen.getByRole("button", { name: "影子跟打《听见风铃》" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "影子节奏" }), "60");
  await waitFor(() => expect(screen.getByLabelText("影子跟打输入")).toBe(document.activeElement));
  const caret = () => container.querySelector<HTMLElement>(".passage-caret:not(.ghost-caret)")!;
  expect(container.querySelector(".ghost-caret")).toBeTruthy();
  expect(caret().dataset.index).toBe("0");
  await user.keyboard("l");
  expect(caret().dataset.offset).toBe("1");
  await user.keyboard("{Backspace}");
  expect(caret().dataset.offset).toBe("0");
  await user.keyboard(encode("lin"));
  expect(caret().dataset.index).toBe("1");
  expect(caret().dataset.offset).toBe("0");
  expect(localStorage.getItem("hexi-shadow-v1:contrast-in-ing")).toBeNull();
  await user.click(screen.getByRole("button", { name: "专注模式" }));
  expect(screen.getByRole("textbox", { name: "影子跟打输入" })).toBe(document.activeElement);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: "专注模式" }).getAttribute("aria-pressed")).toBe(
    "false",
  );
});

test("keystroke sound preferences survive remount independently of spoken hints", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: "击键声" }));
  expect(screen.getByRole("radio", { name: "静音" }).getAttribute("aria-checked")).toBe("true");
  await user.click(screen.getByRole("radio", { name: "机械键" }));
  await user.click(screen.getByRole("radio", { name: "轻" }));
  await user.click(screen.getByRole("button", { name: "完成" }));
  await waitFor(() => expect(input()).toBe(document.activeElement));
  expect(JSON.parse(localStorage.getItem("hexi-audio-v1")!).autoRead).toBe(false);
  view.unmount();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "击键声" }));
  expect(screen.getByRole("radio", { name: "机械键" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("radio", { name: "轻" }).getAttribute("aria-checked")).toBe("true");
});

test("article lookup supports keyboard selection and dismissal preserves a half-typed character", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "影子跟打" }));
  const field = () => screen.getByRole("textbox", { name: "影子跟打输入" });
  const picker = () => screen.getByRole("button", { name: /切换跟打文章/ });
  await user.keyboard("m");
  await user.click(picker());
  const search = () => screen.getByRole("combobox", { name: "查找跟打文章" });
  await user.type(search(), "xyzzy");
  expect(screen.getByText("没有找到匹配的文章")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "清空搜索" }));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(field()).toBe(document.activeElement));
  expect(field()).toHaveProperty("value", "m");
  await user.click(picker());
  await user.type(search(), "林间很静{Enter}");
  await waitFor(() => expect(picker().getAttribute("aria-label")).toContain("听见风铃"));
  expect(field()).toBe(document.activeElement);
  await user.keyboard(encode("lin"));
  expect(document.querySelector(".shadow-passage [aria-current]")?.textContent).toBe("间");
});
test("group picker switches directly to typing and leaves the active group intact on cancel", async () => {
  const user = userEvent.setup();
  render(<App />);
  const trigger = screen.getByRole("button", { name: "切换分组" });
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "选择练习分组" });
  await user.click(within(dialog).getByRole("button", { name: /零声母/ }));
  await waitFor(() => expect(input()).toBe(document.activeElement));
  expect(screen.getByRole("heading", { name: "零声母" })).toBeTruthy();
  await user.click(trigger);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toBe(document.activeElement));
  expect(screen.getByRole("heading", { name: "零声母" })).toBeTruthy();
});
