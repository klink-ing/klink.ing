// src/pages/resume/txt.ts
import * as components from "@/lib/resume/text-components";
import { renderText } from "@/lib/resume/render-text";
import Markdoc from "@markdoc/markdoc";
import { baseConfig } from "@/lib/resume/markdoc-base";
import { downloadHeaders } from "@/lib/resume/download";
import { getEntry } from "astro:content";

export const prerender = true;

export async function GET() {
  const entry = await getEntry("resume", "resume");
  if (!entry) {
    throw new Error("resume entry not found");
  }
  // Astro's glob loader exposes raw `.mdoc` content via `entry.body`.
  // Guard against undefined defensively — produces a zero-length body
  // rather than crashing if Astro's loader semantics change.
  const raw = entry.body ?? "";
  if (!raw) {
    throw new Error("resume entry has empty body — check the glob loader");
  }
  const ast = Markdoc.parse(raw);
  const tree = Markdoc.transform(ast, {
    ...baseConfig,
    nodes: {
      ...baseConfig.nodes,
      heading: {
        render: "Heading",
        attributes: { level: { type: Number, required: true } },
      },
    },
    variables: { frontmatter: entry.data },
  });
  const { name, github, email } = entry.data;
  const header = `${name}\n${github}\n${email}\n`;
  const body = renderText(tree, { components: { ...components } });
  const content = `${(header + body).trim()}\n`;
  return new Response(content, { headers: downloadHeaders("txt") });
}
