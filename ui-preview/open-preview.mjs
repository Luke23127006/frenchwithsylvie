import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const url = "http://127.0.0.1:3001";
const previewFolder = fileURLToPath(new URL(".", import.meta.url));

function openBrowser() {
  const installFolders = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
    .filter(Boolean);
  const browser = installFolders
    .flatMap((folder) => [
      join(folder, "Google", "Chrome", "Application", "chrome.exe"),
      join(folder, "Microsoft", "Edge", "Application", "msedge.exe"),
    ])
    .find((path) => existsSync(path));

  if (!browser) {
    console.log(`Open ${url} in a private window with browser extensions disabled.`);
    return;
  }

  const window = spawn(browser, [
    `--user-data-dir=${join(previewFolder, ".preview-browser")}`,
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    url,
  ], { detached: true, stdio: "ignore" });
  window.on("error", () => console.log(`Open ${url} in a private window with browser extensions disabled.`));
  window.unref();
}

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3001"],
  { cwd: previewFolder, stdio: ["inherit", "pipe", "inherit"] },
);

let opened = false;
createInterface({ input: server.stdout }).on("line", (line) => {
  console.log(line);
  if (opened || !line.includes("Ready in")) return;

  opened = true;
  console.log(`Preview is ready at ${url}. Close this window to stop it.`);
  openBrowser();
});

server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
