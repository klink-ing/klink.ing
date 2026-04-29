// src/pages/resume/pdf.ts
import fs from "node:fs";
import path from "node:path";

export const prerender = true;

export async function GET() {
  const buffer = fs.readFileSync(path.join(process.cwd(), "src/assets/resume.pdf"));
  return new Response(buffer);
}
