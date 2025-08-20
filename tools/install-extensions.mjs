import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const exts = JSON.parse(readFileSync(".vscode/extensions.json", "utf8")).recommendations || [];
if (!exts.length) process.exit(0);

// Cursor가 있으면 우선, 없으면 VS Code
const bin = (() => {
  try { execSync("cursor --version", { stdio: "ignore" }); return "cursor"; } catch {}
  try { execSync("code --version", { stdio: "ignore" }); return "code"; } catch {}
  console.error("Neither `cursor` nor `code` CLI found. Install one and ensure it's in PATH.");
  process.exit(1);
})();

// 이미 설치된 목록
const installed = execSync(`${bin} --list-extensions`).toString().split("\n").map(s => s.trim()).filter(Boolean);

// 필요한 것만 설치
for (const id of exts) {
  if (installed.includes(id)) continue;
  console.log(`Installing ${id} via ${bin}...`);
  execSync(`${bin} --install-extension ${id}`, { stdio: "inherit" });
}

console.log("Done.");
