// scripts/generate-resume-pdf.ts
//
// Boots the Astro dev server, navigates headless Chrome to /resume,
// prints the page to PDF, and writes it to src/assets/resume.pdf where
// src/pages/resume/pdf.ts picks it up at build time.

import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outPath = path.join(repoRoot, "src/assets/resume.pdf");

async function startDevServer(): Promise<{ url: string; stop: () => Promise<void> }> {
  const proc = spawn("vp", ["run", "dev"], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    detached: true,
  });

  const url = await new Promise<string>((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      reject(new Error("dev server did not become ready within 60s"));
    }, 60_000);
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      buf += text;
      process.stdout.write(text);
      // Strip ANSI escape sequences before matching.
      // eslint-disable-next-line no-control-regex
      const stripped = buf.replace(/\u001b\[[0-9;]*m/g, "");
      const match = /Local[:\s]+\s*(https?:\/\/\S+)/.exec(stripped);
      if (match) {
        clearTimeout(timer);
        resolve(match[1].replace(/\/+$/, ""));
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", (chunk) => process.stderr.write(chunk));
    proc.on("error", reject);
    proc.on("exit", (code) =>
      reject(new Error(`dev server exited before becoming ready (code ${code})`)),
    );
  });

  const killGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-proc.pid!, signal);
    } catch {
      // group may already be gone
    }
  };

  return {
    url,
    stop: () =>
      new Promise<void>((resolve) => {
        proc.once("exit", () => resolve());
        killGroup("SIGTERM");
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        setTimeout(() => killGroup("SIGKILL"), 5000).unref();
      }),
  };
}

async function main() {
  const { url, stop } = await startDevServer();
  console.log(`dev server ready at ${url}`);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${url}/resume`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, pdf);
    console.log(`wrote ${path.relative(repoRoot, outPath)} (${pdf.byteLength} bytes)`);
  } finally {
    await browser.close();
    await stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
