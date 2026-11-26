import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { ROW_COURSES } from "./row-course";
import { articleItems } from "./data";
import { STORAGE } from "./practice";

test.each(ROW_COURSES)("$label short sentences train every key and favour that row", (row) => {
  const keys = new Set<string>();
  expect(row.sentences.length).toBeGreaterThanOrEqual(10);
  for (const sentence of row.sentences) {
    const items = articleItems(sentence);
    const presses = items.map((item) => item.answer).join("");
    expect(presses).toMatch(/^[a-z]+$/);
    expect(presses.length).toBe(items.length * 2);
    const hits = presses.split("").filter((key) => row.keys.includes(key));
    hits.forEach((key) => keys.add(key));
    expect(hits.length / presses.length).toBeGreaterThanOrEqual(0.7);
    expect(sentence.hits).toBe(hits.length);
  }
  expect([...keys].sort().join("")).toBe(row.keys.split("").sort().join(""));
});

test("choose a row, change sentences, type to finish and continue in the same row", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: "盲打课程" }));
  expect(screen.getByRole("heading", { name: "中排短句" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: /^下排/ }));
  const passage = () => view.container.querySelector(".shadow-passage")!.textContent;
  const first = passage();
  await user.click(screen.getByRole("button", { name: "换一句" }));
  expect(passage()).not.toBe(first);
  const sentence = ROW_COURSES[2].sentences.find((s) => s.text === passage())!;
  await user.keyboard(
    articleItems(sentence)
      .map((item) => item.answer)
      .join(""),
  );
  expect(JSON.parse(localStorage.getItem(STORAGE)!).articleCompletion[sentence.id]).toEqual({
    rows: true,
  });
  expect(screen.getByRole("button", { name: "下一句" })).toBe(document.activeElement);
  await user.keyboard("{Enter}");
  expect(screen.getByRole("textbox", { name: "盲打短句输入" })).toBe(document.activeElement);
  expect(passage()).not.toBe(sentence.text);
  expect(screen.getByRole("heading", { name: "下排短句" })).toBeTruthy();
});
