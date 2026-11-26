import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = path.join(root, ".agents");
const destination = path.join(directory, "mcp_config.json");
const token = process.env.REUI_MCP_TOKEN?.trim();
if (!token || /[\r\n]/.test(token))
  throw new Error("Export a valid REUI_MCP_TOKEN in your shell, then run npm run mcp:sync again.");

// Refuse to put credentials into a tracked file or an unignored checkout.
try {
  execFileSync("git", ["check-ignore", "--quiet", ".agents/mcp_config.json"], {
    cwd: root,
    stdio: "ignore",
  });
} catch {
  throw new Error(
    ".agents/mcp_config.json must be untracked and Git-ignored before generating it.",
  );
}

const config = JSON.parse(await readFile(path.join(directory, "mcp_config.template.json"), "utf8"));
config.mcpServers.reui.headers = {
  ...config.mcpServers.reui.headers,
  Authorization: `Bearer ${token}`,
};

const staging = await mkdtemp(path.join(directory, ".mcp-config-"));
try {
  const next = path.join(staging, "mcp_config.json");
  await writeFile(next, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await rename(next, destination);
} finally {
  await rm(staging, { recursive: true, force: true });
}
console.log("Generated .agents/mcp_config.json (Git-ignored, owner read/write only).");
