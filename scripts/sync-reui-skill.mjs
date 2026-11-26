import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The official installer also edits global MCP settings; consume only its skill bundle.
const response = await fetch("https://mcp.reui.io/api/skills/download", {
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`ReUI skill download failed: HTTP ${response.status}`);
const bundle = await response.json();
if (
  typeof bundle.version !== "string" ||
  !Array.isArray(bundle.files) ||
  !bundle.files.some((file) => file.path === "SKILL.md")
)
  throw new Error("Invalid ReUI skill bundle");
const paths = new Set();
for (const file of bundle.files) {
  if (
    typeof file.path !== "string" ||
    typeof file.content !== "string" ||
    file.path.includes("\\") ||
    file.path.split("/").some((part) => !part || part === "." || part === "..") ||
    paths.has(file.path)
  )
    throw new Error("Invalid ReUI skill file path or content");
  paths.add(file.path);
}

const parent = fileURLToPath(new URL("../.agents/skills/", import.meta.url));
const destination = path.join(parent, "reui");
await mkdir(parent, { recursive: true });
const staging = await mkdtemp(path.join(parent, ".reui-"));
const next = path.join(staging, "next");
const previous = path.join(staging, "previous");
try {
  for (const file of bundle.files) {
    const target = path.join(next, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
  // This file records provenance without changing the downloaded upstream instructions.
  await writeFile(
    path.join(next, "source.json"),
    `${JSON.stringify({ url: response.url, version: bundle.version }, null, 2)}\n`,
  );
  let replaced = false;
  try {
    await rename(destination, previous);
    replaced = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await rename(next, destination);
  } catch (error) {
    if (replaced) await rename(previous, destination);
    throw error;
  }
  console.log(`ReUI skill ${bundle.version}: .agents/skills/reui (${bundle.files.length} files)`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
