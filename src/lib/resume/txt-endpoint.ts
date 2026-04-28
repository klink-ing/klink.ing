// src/pages/resume/txt.ts
import { getEntry } from "astro:content";
import Markdoc from "@markdoc/markdoc";

import { baseConfig } from "@/lib/resume/markdoc-base";
import { type TextComponents, renderText } from "@/lib/resume/render-text";
import * as components from "@/lib/resume/text-components";

export const prerender = true;

export async function GET() {
  const entry = await getEntry("resume", "resume");
  if (!entry) throw new Error("resume entry not found");
  // Astro's glob loader exposes raw `.mdoc` content via `entry.body`.
  // Guard against undefined defensively — produces a zero-length body
  // rather than crashing if Astro's loader semantics change.
  const raw = entry.body ?? "";
  if (!raw) throw new Error("resume entry has empty body — check the glob loader");
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
  const body = renderText(tree, { components: components as unknown as TextComponents });
  const content = (header + body).trim();
  return new Response(content);
}
