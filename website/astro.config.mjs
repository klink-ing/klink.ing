// astro.config.mjs
import { RESUME_FILENAME, RESUME_FORMATS } from "./src/lib/resume/download.ts";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import markdoc from "@astrojs/markdoc";
import path from "node:path";
import { writeFile } from "node:fs/promises";

function resumeHeaders() {
  return {
    name: "resume-headers",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const lines = [];
        for (const [format, { contentType }] of Object.entries(RESUME_FORMATS)) {
          lines.push(`/resume/${format}`);
          lines.push(`  Content-Type: ${contentType}`);
          lines.push(`  Content-Disposition: attachment; filename="${RESUME_FILENAME}.${format}"`);
          lines.push("");
        }
        await writeFile(path.join(distDir, "_headers"), lines.join("\n"));
      },
    },
  };
}

export default defineConfig({
  integrations: [markdoc(), resumeHeaders()],
});
