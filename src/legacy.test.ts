import { execFileSync } from "node:child_process";
import { expect, test } from "vite-plus/test";

test.each(["qa.cjs", "qa-audio.cjs"])("original regression suite %s still passes", (script) => {
  expect(() =>
    execFileSync(process.execPath, [script], { cwd: process.cwd(), encoding: "utf8" }),
  ).not.toThrow();
});
