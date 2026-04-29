// src/lib/resume/download.ts
// Single source of truth for the resume download filename and per-format
// Content-Type used by the /resume/{txt,md,pdf} routes and the generated
// Netlify _headers file (see astro.config.mjs).

export const RESUME_FILENAME = "chris-klink-resume";

export const RESUME_FORMATS = {
  txt: { contentType: "text/plain; charset=UTF-8" },
  md: { contentType: "text/markdown; charset=UTF-8" },
  pdf: { contentType: "application/pdf" },
} as const;

export type ResumeFormat = keyof typeof RESUME_FORMATS;

export function downloadHeaders(format: ResumeFormat): Record<string, string> {
  return {
    "Content-Type": RESUME_FORMATS[format].contentType,
    "Content-Disposition": `attachment; filename="${RESUME_FILENAME}.${format}"`,
  };
}
