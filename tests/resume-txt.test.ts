// tests/resume-txt.test.ts
import { readFileSync } from "node:fs";
import Markdoc from "@markdoc/markdoc";
import yaml from "js-yaml";
import { describe, expect, it } from "vite-plus/test";

import { baseConfig } from "@/lib/resume/markdoc-base";
import { type TextComponents, renderText } from "@/lib/resume/render-text";
import * as components from "@/lib/resume/text-components";

interface Frontmatter {
  name: string;
  github: string;
  email: string;
}

describe("resume txt output", () => {
  it("matches the pre-migration snapshot byte-for-byte", () => {
    const raw = readFileSync("src/content/resume/resume.mdoc", "utf-8");
    const ast = Markdoc.parse(raw);
    const frontmatter = yaml.load(ast.attributes.frontmatter as string) as Frontmatter;
    const tree = Markdoc.transform(ast, {
      ...baseConfig,
      nodes: {
        ...baseConfig.nodes,
        heading: {
          render: "Heading",
          attributes: { level: { type: Number, required: true } },
        },
      },
      variables: { frontmatter },
    });
    const header = `${frontmatter.name}\n${frontmatter.github}\n${frontmatter.email}\n`;
    const actual = (
      header + renderText(tree, { components: components as unknown as TextComponents })
    ).trim();
    const expected = readFileSync("tests/fixtures/resume-txt-snapshot.txt", "utf-8").trim();
    expect(actual).toBe(expected);
  });
});
