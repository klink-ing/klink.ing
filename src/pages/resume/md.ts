// src/pages/resume/md.ts
import * as components from "@/lib/resume/md-components";
import { renderText } from "@/lib/resume/render-text";
import Markdoc from "@markdoc/markdoc";
import { baseConfig } from "@/lib/resume/markdoc-base";
import { downloadHeaders } from "@/lib/resume/download";
import { getEntry } from "astro:content";
import prettier from "prettier";

export const prerender = true;

export async function GET() {
  const entry = await getEntry("resume", "resume");
  if (!entry) {
    throw new Error("resume entry not found");
  }
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
  const githubUsername = github.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
  const header = `# ${name}\n\n- [${githubUsername}@github](${github})\n- [${email}](mailto:${email})`;
  const body = renderText(tree, { components: { ...components } });
  const content = await prettier.format(`${(header + body).trim()}\n`, { parser: "markdown" });
  return new Response(content, { headers: downloadHeaders("md") });
}
