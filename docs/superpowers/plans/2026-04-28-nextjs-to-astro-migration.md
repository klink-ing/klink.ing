# Next.js → Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert this static-content site from Next.js 16 to Astro 5 (static output) while preserving the Markdoc-driven resume rendering, the `/resume/txt` download endpoint with custom headers, and all existing URLs and visual design.

**Architecture:** Astro 5 static output with the official `@astrojs/markdoc` integration for the HTML resume; a custom Markdoc-tree text walker for the TXT resume; Netlify edge headers for the `/resume/txt` Content-Type / Content-Disposition. No React, no client JS, no SSR adapter.

**Tech Stack:** Astro 5, `@astrojs/markdoc`, `@markdoc/markdoc`, CSS Modules, Vite+ tooling (`vp run`, `vp check`, `vp test`), TypeScript strict, Netlify static hosting.

**Spec:** [`docs/superpowers/specs/2026-04-28-nextjs-to-astro-migration-design.md`](../specs/2026-04-28-nextjs-to-astro-migration-design.md)

**Working tree assumption:** This plan should be executed on a feature branch (or worktree). Create a branch named `migrate-to-astro` before starting if not already on one.

---

## File Map

**New:**

- `astro.config.mjs` — Astro config with markdoc integration
- `markdoc.config.mjs` — HTML component bindings for Markdoc tags
- `src/content.config.ts` — content collection definition
- `src/content/resume/resume.mdoc` — moved from project root
- `src/layouts/RootLayout.astro` — `<html>`/`<head>`/`<body>` shell
- `src/pages/index.astro` — splash page (replaces `src/app/page.tsx`)
- `src/pages/resume/index.astro` — HTML resume page
- `src/pages/resume/txt.ts` — static TXT endpoint
- `src/components/Logo.astro` — ported from `Logo.tsx`
- `src/components/MainMenu.astro` — ported from `MainMenu.tsx`
- `src/components/resume/Stint.astro`
- `src/components/resume/SkillsSection.astro`
- `src/components/resume/List.astro`
- `src/components/resume/Intro.astro`
- `src/components/resume/PageBreak.astro`
- `src/lib/resume/markdoc-base.ts` — shared tag/transform definitions
- `src/lib/resume/render-text.ts` — generic walker engine + `decorateLis`
- `src/lib/resume/text-components.ts` — one renderer fn per HTML component + `Heading` + `Li`
- `src/styles/global.css` — from `src/app/globals.css`
- `src/styles/splash.module.css` — from `src/app/index.module.css`
- `src/styles/Logo.module.css` — moved from `src/app/components/`
- `src/styles/MainMenu.module.css` — moved from `src/app/components/`
- `src/styles/resume.module.css` — moved from `src/app/resume/(html)/`
- `tests/fixtures/resume-txt-snapshot.txt` — captured TXT before migration
- `tests/resume-txt.test.ts` — byte-equal snapshot assertion

**Modified:**

- `package.json` — drop next/react/js-yaml prod deps, add astro/integration, update scripts
- `tsconfig.json` — extend `astro/tsconfigs/strict`
- `netlify.toml` — `publish=dist`, `[[headers]]` for `/resume/txt`
- `.gitignore` — drop `.next/`, add `dist/` and `.astro/`
- `.github/workflows/ci.yml` — add `vp run build` and `vp test` steps

**Deleted:**

- `src/app/` (entire directory)
- `next.config.ts`
- `next-env.d.ts`
- `styles.d.ts`
- `tsconfig.tsbuildinfo`
- `resume.markdoc.md` (moved into content collection)
- `src/global.d.ts` (verify still needed; likely deletable under Astro typing)

---

## Phase 1 — Capture TXT snapshot fixture

The byte-equal snapshot is the contract for the TXT migration. Capture it from the **current Next.js codebase** before changing anything.

### Task 1: Capture pre-migration TXT output

**Files:**

- Create: `tests/fixtures/resume-txt-snapshot.txt`

- [ ] **Step 1: Start Next.js dev server in background**

```bash
cd /Users/klink/localdev/klinking
pnpm dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid
```

Wait ~5 seconds for the server to come up (poll `/tmp/next-dev.log` for "Ready" line).

- [ ] **Step 2: Capture the TXT response body**

```bash
mkdir -p tests/fixtures
curl -fsS http://localhost:3000/resume/txt -o tests/fixtures/resume-txt-snapshot.txt
```

Verify with `wc -l tests/fixtures/resume-txt-snapshot.txt` — expect non-zero line count.

- [ ] **Step 3: Stop the Next.js dev server**

```bash
kill "$(cat /tmp/next-dev.pid)" || true
rm -f /tmp/next-dev.pid /tmp/next-dev.log
```

- [ ] **Step 4: Sanity-check the fixture**

```bash
head -5 tests/fixtures/resume-txt-snapshot.txt
```

Expected: Starts with the candidate name, GitHub URL, email — matches the frontmatter of `resume.markdoc.md`.

- [ ] **Step 5: Commit the fixture**

```bash
git add tests/fixtures/resume-txt-snapshot.txt
git commit -m "Capture TXT resume snapshot for migration verification"
```

---

## Phase 2 — Astro scaffolding alongside Next.js

The two frameworks coexist during migration: Next.js owns `src/app/`, Astro owns `src/pages/` + `src/content/`. We don't change `package.json` scripts yet — the existing `pnpm dev` keeps running Next.js.

### Task 2: Install Astro and the markdoc integration

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add Astro and `@astrojs/markdoc`**

```bash
vp add astro @astrojs/markdoc
```

This adds them to `dependencies`. Verify with `vp list astro @astrojs/markdoc`.

- [ ] **Step 2: Verify `@markdoc/markdoc` stays installed**

`@markdoc/markdoc` should already be in `devDependencies`. The TXT endpoint and base config import from it. Move it to `dependencies` so it's available at build time on Netlify:

```bash
vp remove @markdoc/markdoc
vp add @markdoc/markdoc
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add Astro and @astrojs/markdoc dependencies"
```

### Task 3: Create `astro.config.mjs`

**Files:**

- Create: `astro.config.mjs`

- [ ] **Step 1: Write the config**

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";

export default defineConfig({
  integrations: [markdoc()],
});
```

- [ ] **Step 2: Verify Astro recognizes the project**

```bash
vp dlx astro check --help
```

(We don't run the full `astro check` yet because there's no source for it to type-check. This just verifies the CLI is reachable.)

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "Add astro.config.mjs with markdoc integration"
```

### Task 4: Update `.gitignore` for Astro outputs

**Files:**

- Modify: `.gitignore`

- [ ] **Step 1: Add Astro paths**

Append the following lines to `.gitignore` (do NOT remove `.next/` yet — Next.js still runs):

```
# Astro
dist/
.astro/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "Ignore Astro build outputs"
```

---

## Phase 3 — Content collection + content move

### Task 5: Define the `resume` content collection

**Files:**

- Create: `src/content.config.ts`

- [ ] **Step 1: Write the collection definition**

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

export const collections = {
  resume: defineCollection({
    loader: glob({ pattern: "**/*.mdoc", base: "./src/content/resume" }),
    schema: z.object({
      name: z.string(),
      github: z.string().url(),
      email: z.string().email(),
    }),
  }),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/content.config.ts
git commit -m "Define resume content collection"
```

### Task 6: Move resume into the content collection

**Files:**

- Move: `resume.markdoc.md` → `src/content/resume/resume.mdoc`

- [ ] **Step 1: Move the file**

```bash
mkdir -p src/content/resume
git mv resume.markdoc.md src/content/resume/resume.mdoc
```

- [ ] **Step 2: Verify Next.js can still find it for now**

The existing `src/app/resume/utils.ts` reads `path.join(process.cwd(), "resume.markdoc.md")` — this will break. Update it to point at the new location:

In `src/app/resume/utils.ts`, change:

```ts
const filePath = path.join(process.cwd(), "resume.markdoc.md");
```

to:

```ts
const filePath = path.join(process.cwd(), "src/content/resume/resume.mdoc");
```

- [ ] **Step 3: Re-run the snapshot capture to make sure Next.js still produces the same output**

```bash
pnpm dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid
sleep 5
curl -fsS http://localhost:3000/resume/txt -o /tmp/post-move-resume-txt.txt
kill "$(cat /tmp/next-dev.pid)"
rm -f /tmp/next-dev.pid /tmp/next-dev.log
diff tests/fixtures/resume-txt-snapshot.txt /tmp/post-move-resume-txt.txt
```

Expected: zero diff (the file move is path-only; content is identical).

- [ ] **Step 4: Commit**

```bash
git add src/content/resume/resume.mdoc src/app/resume/utils.ts
git commit -m "Move resume.markdoc.md into Astro content collection"
```

---

## Phase 4 — TXT rendering pipeline

Build the TXT pipeline first (driven by the snapshot test) so we have byte-equal verification before touching HTML.

### Task 7: Create shared Markdoc base config

**Files:**

- Create: `src/lib/resume/markdoc-base.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/lib/resume
```

- [ ] **Step 2: Write `markdoc-base.ts`** (verbatim port of the existing `src/app/resume/markdoc-config-base.ts` — _no behavior changes_)

```ts
// src/lib/resume/markdoc-base.ts
import Markdoc, { type Config, type Node } from "@markdoc/markdoc";

const addListAttributes = (node: Node, attrs: Record<string, unknown>): void => {
  if (!node.children.length) return;
  node.children.forEach((child) => {
    if (child.type === "list") {
      child.attributes = { ...child.attributes, ...attrs };
      return;
    }
    addListAttributes(child, attrs);
  });
};

export const baseConfig: Config = {
  tags: {
    intro: { render: "Intro", attributes: {} },
    stint: {
      render: "Stint",
      attributes: {
        title: { type: String, required: true },
        start: { type: String },
        end: { type: String },
        location: { type: String, required: true },
        organization: { type: String, required: true },
        url: { type: String },
        pageBreak: { type: Boolean },
      },
    },
    skillsSection: {
      render: "SkillsSection",
      attributes: {},
      transform(node, config) {
        addListAttributes(node, { listType: "compact" });
        return new Markdoc.Tag("SkillsSection", node.attributes, node.transformChildren(config));
      },
    },
    pageBreak: { render: "PageBreak", attributes: {}, selfClosing: true },
  },
  nodes: {
    list: {
      attributes: {
        ordered: { type: Boolean },
        marker: { type: String },
        listType: { type: String },
      },
      transform(node, config) {
        addListAttributes(node, { listType: "compact" });
        return new Markdoc.Tag("List", node.attributes, node.transformChildren(config));
      },
    },
  },
};
```

- [ ] **Step 3: Verify it type-checks**

```bash
vp check --type-check
```

Expected: zero errors related to this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/resume/markdoc-base.ts
git commit -m "Add shared Markdoc base config for resume rendering"
```

### Task 8: Write the failing snapshot test

We write the test before the implementation exists so the failure mode confirms the test is wired up.

**Files:**

- Create: `tests/resume-txt.test.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/resume-txt.test.ts
import { readFileSync } from "node:fs";
import Markdoc from "@markdoc/markdoc";
import yaml from "js-yaml";
import { describe, expect, it } from "vite-plus/test";

import { baseConfig } from "@/lib/resume/markdoc-base";
import { renderText } from "@/lib/resume/render-text";
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
    const actual = (header + renderText(tree, { components })).trim();
    const expected = readFileSync("tests/fixtures/resume-txt-snapshot.txt", "utf-8").trim();
    expect(actual).toBe(expected);
  });
});
```

- [ ] **Step 2: Move `js-yaml` and `@types/js-yaml` to devDependencies**

In `package.json`, move:

- `js-yaml` from `dependencies` → `devDependencies`
- `@types/js-yaml` already in `devDependencies` — leave it

```bash
vp remove js-yaml
vp add -D js-yaml
```

- [ ] **Step 3: Run the test — expect failure due to missing modules**

```bash
vp test tests/resume-txt.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/resume/render-text'" or "Cannot find module '@/lib/resume/text-components'". This proves the test is being discovered.

- [ ] **Step 4: If `vp test` fails to even discover the test (e.g., no test runner configured), add a minimal `vitest` config**

Only if needed. Create `vitest.config.ts`:

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { alias: { "@": new URL("./src/", import.meta.url).pathname } },
});
```

Re-run `vp test`.

- [ ] **Step 5: Commit (failing test is deliberate scaffolding)**

```bash
git add tests/resume-txt.test.ts package.json pnpm-lock.yaml
[ -f vitest.config.ts ] && git add vitest.config.ts
git commit -m "Add failing snapshot test for TXT resume migration"
```

### Task 9: Implement `renderText` engine + `decorateLis` (no components yet)

**Files:**

- Create: `src/lib/resume/render-text.ts`

- [ ] **Step 1: Write the engine, decorator, and the wrap helper**

```ts
// src/lib/resume/render-text.ts
import { type RenderableTreeNode, Tag } from "@markdoc/markdoc";

export type TextRender = (node: RenderableTreeNode | RenderableTreeNode[]) => string;

export type TextComponent<Attrs = Record<string, unknown>> = (
  attrs: Attrs,
  children: RenderableTreeNode[],
  render: TextRender,
) => string;

export type TextComponents = Record<string, TextComponent>;

const isTag = (node: RenderableTreeNode): node is Tag =>
  typeof node === "object" && node !== null && "name" in node && "attributes" in node;

/**
 * Walks the tree and pushes context attributes onto direct `li` children of
 * every `List` Tag so the generic Li renderer can pick its format without
 * needing parent-pointer access.
 */
function decorateLis(node: RenderableTreeNode): RenderableTreeNode {
  if (Array.isArray(node)) return node.map(decorateLis);
  if (typeof node !== "object" || node === null) return node;
  if (!isTag(node)) return node;
  if (node.name === "List") {
    const liChildren = node.children.filter((c) => isTag(c) && c.name === "li");
    const total = liChildren.length;
    let index = 0;
    const newChildren = node.children.map((c) => {
      if (isTag(c) && c.name === "li") {
        index++;
        return new Tag(
          "li",
          {
            ...c.attributes,
            listType: node.attributes.listType ?? "bullet",
            ordered: !!node.attributes.ordered,
            index,
            last: index === total,
          },
          c.children.map(decorateLis) as RenderableTreeNode[],
        );
      }
      return decorateLis(c);
    });
    return new Tag(node.name, node.attributes, newChildren as RenderableTreeNode[]);
  }
  return new Tag(
    node.name,
    node.attributes,
    node.children.map(decorateLis) as RenderableTreeNode[],
  );
}

export function renderText(tree: RenderableTreeNode, opts: { components: TextComponents }): string {
  const decorated = decorateLis(tree);
  const render: TextRender = (node) => {
    if (Array.isArray(node)) return node.map(render).join("");
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (!isTag(node)) return "";
    const Component = opts.components[node.name];
    if (Component) return Component(node.attributes, node.children, render);
    // Native HTML tag passthrough — emit children only, drop wrapper.
    return render(node.children as RenderableTreeNode[]);
  };
  return render(decorated);
}

/**
 * Word-wraps `text` to `lineLength` columns. The first line is prefixed with
 * `prefix`; continuation lines are prefixed with `indent` (same width).
 * Returns the joined string with trailing newlines per line.
 */
export function wrapWithPrefix(
  text: string,
  prefix: string,
  indent: string,
  lineLength: number,
): string {
  if (!text) return "";
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "";
  const lines: string[] = [];
  let currentLine = prefix;
  let isFirstLine = true;
  for (const word of words) {
    const needsSpace = currentLine.length > 0 && !currentLine.endsWith(" ");
    const separator = needsSpace ? " " : "";
    const testLine = currentLine + separator + word;
    const lineHasWords = isFirstLine
      ? currentLine.length > prefix.length
      : currentLine.length > indent.length;
    if (testLine.length > lineLength && lineHasWords) {
      lines.push(`${currentLine}\n`);
      currentLine = indent + word;
      isFirstLine = false;
    } else {
      currentLine = testLine;
      isFirstLine = false;
    }
  }
  const lineHasWords = isFirstLine
    ? currentLine.length > prefix.length
    : currentLine.length > indent.length;
  if (lineHasWords) lines.push(`${currentLine}\n`);
  return lines.join("");
}
```

- [ ] **Step 2: Run the test — expect failure on "Cannot find module text-components"**

```bash
vp test tests/resume-txt.test.ts
```

Expected: still failing, but now the failure shifts to the missing `text-components` import.

- [ ] **Step 3: Commit**

```bash
git add src/lib/resume/render-text.ts
git commit -m "Implement renderText engine with Li context decoration"
```

### Task 10: Implement `text-components.ts`

**Files:**

- Create: `src/lib/resume/text-components.ts`

- [ ] **Step 1: Write the component renderers**

```ts
// src/lib/resume/text-components.ts
import { type RenderableTreeNode } from "@markdoc/markdoc";

import { type TextComponent, wrapWithPrefix } from "./render-text";

export const Intro: TextComponent = (_attrs, children, render) => `\n\n${render(children)}`;

export const Stint: TextComponent<{
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
}> = (attrs, children, render) => {
  const title = `${attrs.title.toUpperCase()}\n`;
  const dates =
    attrs.start && attrs.end
      ? `${attrs.start} – ${attrs.end}\n`
      : `${attrs.start ?? attrs.end ?? ""}\n`;
  const orgLine = `${attrs.organization}${attrs.url ? ` (${attrs.url})` : ""}${attrs.location ? ` - ${attrs.location}` : ""}\n`;
  const body = render(children);
  const tail = body.trim().length > 0 ? `\n${body}\n\n\n` : "\n\n";
  return `${title}${dates}${orgLine}${tail}`;
};

export const SkillsSection: TextComponent = (_attrs, children, render) => render(children);

export const List: TextComponent<{ listType?: "bullet" | "compact" }> = (
  attrs,
  children,
  render,
) => (attrs.listType === "compact" ? `${render(children)}\n\n` : `\n${render(children)}`);

export const Li: TextComponent<{
  listType?: "bullet" | "compact";
  ordered?: boolean;
  index?: number;
  last?: boolean;
}> = (attrs, children, render) => {
  const text = render(children).trim().replace(/\s+/g, " ");
  if (attrs.listType === "compact") {
    return attrs.last ? text : `${text}, `;
  }
  if (attrs.ordered) {
    const prefix = `${attrs.index}. `;
    return wrapWithPrefix(text, prefix, " ".repeat(prefix.length), 80);
  }
  return wrapWithPrefix(text, "- ", "  ", 80);
};

export const PageBreak: TextComponent = () => "";

export const Heading: TextComponent<{ level: number }> = (attrs, children, render) => {
  const text = render(children).toUpperCase();
  if (attrs.level === 4) return `${text}: `;
  if (attrs.level === 3) return `${text}\n\n`;
  if (attrs.level === 2) return `\n\n\n--- ${text} ---\n\n\n`;
  return `${render(children)}\n\n`;
};
```

- [ ] **Step 2: Run the snapshot test**

```bash
vp test tests/resume-txt.test.ts
```

Expected: PASS, OR fail with a diff. If it fails with a diff, the diff is the contract — treat it as a real bug. Common drift sources to inspect:

1. `Stint` whitespace around the body when there are no children (compare `\n\n` vs `\n\n\n`).
2. `Li` compact rendering — make sure `last` is computed correctly when `li`s are interleaved with non-li children (shouldn't happen in this resume but verify).
3. Heading-level fallthrough (level 1, 5, 6) — none should appear in the resume.
4. `List` wrapping of bullet vs compact — ensure the leading `\n` lines up with current output.

Iterate on `text-components.ts` until the test is green. Do not edit `tests/fixtures/resume-txt-snapshot.txt` — the fixture is the truth.

- [ ] **Step 3: Commit**

```bash
git add src/lib/resume/text-components.ts
git commit -m "Implement text components — TXT snapshot test now green"
```

---

## Phase 5 — HTML rendering pipeline

### Task 11: Move CSS Modules under `src/styles/`

CSS Modules need new homes since `src/app/` will be deleted. Astro imports CSS Modules verbatim — no behavior change.

**Files:**

- Move: 5 CSS files

- [ ] **Step 1: Create the directory and move files**

```bash
mkdir -p src/styles
git mv src/app/globals.css src/styles/global.css
git mv src/app/index.module.css src/styles/splash.module.css
git mv src/app/components/Logo.module.css src/styles/Logo.module.css
git mv src/app/components/MainMenu.module.css src/styles/MainMenu.module.css
git mv "src/app/resume/(html)/resume.module.css" src/styles/resume.module.css
```

- [ ] **Step 2: Update Next.js imports to point at new locations**

In `src/app/layout.tsx`, change:

```ts
import "./globals.css";
```

to:

```ts
import "@/styles/global.css";
```

In `src/app/page.tsx`:

```ts
import styles from "./index.module.css";
```

to:

```ts
import styles from "@/styles/splash.module.css";
```

In `src/app/components/Logo.tsx`:

```ts
import styles from "./Logo.module.css";
```

to:

```ts
import styles from "@/styles/Logo.module.css";
```

In `src/app/components/MainMenu.tsx`:

```ts
import styles from "./MainMenu.module.css";
```

to:

```ts
import styles from "@/styles/MainMenu.module.css";
```

In `src/app/resume/(html)/page.tsx` and `src/app/resume/(html)/layout.tsx` and `src/app/resume/(html)/markdoc-components.tsx`:

```ts
import styles from "./resume.module.css";
```

to:

```ts
import styles from "@/styles/resume.module.css";
```

- [ ] **Step 3: Verify Next.js still builds**

```bash
pnpm build
```

Expected: build succeeds. (If it fails, fix import paths until clean.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Centralize CSS Modules under src/styles/"
```

### Task 12: Create resume Astro components

Create the five resume components. Each component is a simple `.astro` file that mirrors its `.tsx` counterpart's DOM output.

**Files:**

- Create: `src/components/resume/Intro.astro`
- Create: `src/components/resume/PageBreak.astro`
- Create: `src/components/resume/SkillsSection.astro`
- Create: `src/components/resume/List.astro`
- Create: `src/components/resume/Stint.astro`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/components/resume
```

- [ ] **Step 2: `Intro.astro`**

```astro
---
import styles from "@/styles/resume.module.css";

interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---
<p class={`${styles.intro}${className ? ` ${className}` : ""}`}><slot /></p>
```

- [ ] **Step 3: `PageBreak.astro`**

```astro
---
import styles from "@/styles/resume.module.css";
---
<div aria-hidden="true" class={styles.pageBreak}></div>
```

- [ ] **Step 4: `SkillsSection.astro`**

```astro
---
import styles from "@/styles/resume.module.css";
---
<div class={styles.skillsSection}><slot /></div>
```

- [ ] **Step 5: `List.astro`**

```astro
---
import styles from "@/styles/resume.module.css";

interface Props {
  ordered?: boolean;
  listType?: "bullet" | "compact";
}

const { ordered = false, listType = "bullet" } = Astro.props;
const className = listType === "compact" ? styles.compactList : styles.bulletList;
const Tag = ordered ? "ol" : "ul";
---
<Tag class={className}><slot /></Tag>
```

- [ ] **Step 6: `Stint.astro`** (with the three preserved behaviors from the spec)

```astro
---
import styles from "@/styles/resume.module.css";

interface Props {
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
  pageBreak?: boolean;
  class?: string;
}

const { title, start, end, location, organization, url, class: className } = Astro.props;

// Education-style title splitting: "Bachelor of Science in Computer Science"
// → keep "Computer Science" on one line.
const inIndex = title.indexOf(" in ");
const titleBefore = inIndex >= 0 ? title.slice(0, inIndex) : null;
const titleAfter = inIndex >= 0 ? title.slice(inIndex + " in ".length) : null;

const hasChildren = Astro.slots.has("default");
const stintClassName = [
  styles.stint,
  hasChildren ? null : styles.noChildren,
  className,
].filter(Boolean).join(" ");

// No-break date ranges: \d+–\d+ in either start or end stays on one line.
// Single tokens like "2024" or "2024–2026" are short enough that the regex
// only matches the en-dash range form anyway.
const wrapNoBreak = (s: string | undefined): string | null => s ?? null;
---
<div class={stintClassName}>
  <div class={styles.topLine}>
    <h3 class={styles.jobTitle}>
      {titleBefore !== null && titleAfter !== null ? (
        <>{titleBefore} in <span style="white-space: nowrap">{titleAfter}</span></>
      ) : (
        title
      )}
    </h3>
    <div style="white-space: nowrap" class={styles.dates}>
      {start && <span class={/^\d+–\d+$/.test(start) ? styles.noBreak : ""}>{wrapNoBreak(start)}</span>}
      {start && end && <> – </>}
      {end && <span class={/^\d+–\d+$/.test(end) ? styles.noBreak : ""}>{wrapNoBreak(end)}</span>}
    </div>
  </div>
  <div class={styles.organization}>
    {url ? <a href={url} target="_blank">{organization}</a> : organization}
  </div>
  <div class={styles.location}>{location}</div>
  <slot />
</div>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/resume/
git commit -m "Add Astro resume components for HTML rendering"
```

### Task 13: Create `markdoc.config.mjs` (HTML component bindings)

**Files:**

- Create: `markdoc.config.mjs`

- [ ] **Step 1: Write the config**

```js
// markdoc.config.mjs
import { component, defineMarkdocConfig } from "@astrojs/markdoc/config";
import { baseConfig } from "./src/lib/resume/markdoc-base.ts";

export default defineMarkdocConfig({
  ...baseConfig,
  tags: {
    intro: {
      ...baseConfig.tags.intro,
      render: component("./src/components/resume/Intro.astro"),
    },
    stint: {
      ...baseConfig.tags.stint,
      render: component("./src/components/resume/Stint.astro"),
    },
    skillsSection: {
      ...baseConfig.tags.skillsSection,
      render: component("./src/components/resume/SkillsSection.astro"),
    },
    pageBreak: {
      ...baseConfig.tags.pageBreak,
      render: component("./src/components/resume/PageBreak.astro"),
    },
  },
  nodes: {
    list: {
      ...baseConfig.nodes.list,
      render: component("./src/components/resume/List.astro"),
    },
    // heading falls through to native <h1>/<h2>/<h3>/...
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add markdoc.config.mjs
git commit -m "Add Markdoc config with HTML Astro component bindings"
```

### Task 14: Create `Logo.astro` and `MainMenu.astro`

**Files:**

- Create: `src/components/Logo.astro`
- Create: `src/components/MainMenu.astro`

- [ ] **Step 1: `Logo.astro`** — port the SVG from `src/app/components/Logo.tsx`

```astro
---
import styles from "@/styles/Logo.module.css";

interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---
<svg
  version="1.1"
  id="Layer_1"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  x="0px"
  y="0px"
  viewBox="0 0 2758 1008"
  xml:space="preserve"
  class={`${className ?? ""} ${styles.logo}`.trim()}
>
  <title>Klink Made</title>
  <!-- Copy the <path> and <polygon> elements from src/app/components/Logo.tsx verbatim -->
</svg>
```

**Important:** copy all `<path>` and `<polygon>` elements from the existing React component verbatim, but replace `xmlnsXlink` → `xmlns:xlink`, `xlinkHref` → `xlink:href`, `xmlSpace` → `xml:space`, `className` → `class`. JSX attribute names → standard SVG attribute names.

- [ ] **Step 2: `MainMenu.astro`**

```astro
---
import Logo from "@/components/Logo.astro";
import styles from "@/styles/MainMenu.module.css";
---
<nav class={styles.menu}>
  <a class={styles.logo} href="/"><Logo /></a>
  <a href="/resume">Resumé</a>
</nav>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Logo.astro src/components/MainMenu.astro
git commit -m "Port Logo and MainMenu to Astro components"
```

### Task 15: Create `RootLayout.astro`

**Files:**

- Create: `src/layouts/RootLayout.astro`

- [ ] **Step 1: Write the layout**

```astro
---
import "@/styles/global.css";

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="stylesheet" href="https://use.typekit.net/lpx7wod.css" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Move `favicon.ico` to `public/`**

```bash
git mv src/app/favicon.ico public/favicon.ico
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add root layout and move favicon to public/"
```

### Task 16: Create the splash page (`src/pages/index.astro`)

**Files:**

- Create: `src/pages/index.astro`

- [ ] **Step 1: Create the directory and the page**

```bash
mkdir -p src/pages/resume
```

```astro
---
// src/pages/index.astro
import Logo from "@/components/Logo.astro";
import RootLayout from "@/layouts/RootLayout.astro";
import styles from "@/styles/splash.module.css";
---
<RootLayout title="Klink" description="All things Klink">
  <div class={styles.splash}>
    <div class={styles.splashInner}>
      <Logo class={styles.logo} />
      <nav>
        <ul>
          <li><a href="/resume">Resumé</a></li>
        </ul>
      </nav>
    </div>
  </div>
</RootLayout>
```

- [ ] **Step 2: Verify Astro dev server starts and serves the splash**

```bash
vp dlx astro dev > /tmp/astro-dev.log 2>&1 &
echo $! > /tmp/astro-dev.pid
sleep 5
curl -fsS http://localhost:4321/ | head -20
kill "$(cat /tmp/astro-dev.pid)" || true
rm -f /tmp/astro-dev.pid /tmp/astro-dev.log
```

Expected: HTML response containing `<title>Klink</title>` and the SVG logo. **Open `http://localhost:4321/` in a browser** before killing — the splash should look identical to the Next.js version.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "Add Astro splash page"
```

### Task 17: Create the HTML resume page

**Files:**

- Create: `src/pages/resume/index.astro`

- [ ] **Step 1: Write the page**

```astro
---
// src/pages/resume/index.astro
import { getEntry, render } from "astro:content";
import Logo from "@/components/Logo.astro";
import MainMenu from "@/components/MainMenu.astro";
import RootLayout from "@/layouts/RootLayout.astro";
import styles from "@/styles/resume.module.css";

const entry = await getEntry("resume", "resume");
if (!entry) throw new Error("resume entry not found");
const { Content } = await render(entry);
const { name, github, email } = entry.data;
const githubUsername = github.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
---
<RootLayout title="Klink - Resumé" description="What's Klink been up to?">
  <div class={styles.resumePage}>
    <MainMenu />
    <article class={styles.resume}>
      <header>
        <Logo class={styles.printLogo} />
        <h1>{name}</h1>
        <ul>
          <li><a target="_blank" href={github}>{githubUsername}@github</a></li>
          <li><a href={`mailto:${email}`}>{email}</a></li>
        </ul>
      </header>
      <Content />
    </article>
  </div>
</RootLayout>
```

- [ ] **Step 2: Run dev server, open browser, compare side-by-side**

```bash
# Astro on :4321
vp dlx astro dev > /tmp/astro-dev.log 2>&1 &
echo $! > /tmp/astro-dev.pid

# Next.js on :3000
pnpm dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid
sleep 5
```

Open `http://localhost:3000/resume` AND `http://localhost:4321/resume` in two browser windows. Compare:

- Header (name, GitHub link, email link)
- Each Stint's title, dates, organization, location, body
- Skills section: comma-joined skill items
- Education stints: title splitting at " in "
- Print preview (Cmd+P): page breaks, header logo, hidden nav

Note any visual diffs. Fix until parity.

```bash
kill "$(cat /tmp/astro-dev.pid)" "$(cat /tmp/next-dev.pid)" || true
rm -f /tmp/astro-dev.pid /tmp/next-dev.pid /tmp/astro-dev.log /tmp/next-dev.log
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/resume/index.astro
git commit -m "Add HTML resume Astro page with markdoc rendering"
```

---

## Phase 6 — Wire the TXT endpoint

### Task 18: Create `src/pages/resume/txt.ts`

**Files:**

- Create: `src/pages/resume/txt.ts`

- [ ] **Step 1: Write the endpoint**

```ts
// src/pages/resume/txt.ts
import { getEntry } from "astro:content";
import Markdoc from "@markdoc/markdoc";

import { baseConfig } from "@/lib/resume/markdoc-base";
import { renderText } from "@/lib/resume/render-text";
import * as components from "@/lib/resume/text-components";

export const prerender = true;

export async function GET() {
  const entry = await getEntry("resume", "resume");
  if (!entry) throw new Error("resume entry not found");
  const ast = Markdoc.parse(entry.body);
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
  const body = renderText(tree, { components });
  const content = (header + body).trim();
  return new Response(content);
}
```

- [ ] **Step 2: Verify the endpoint produces the expected output**

```bash
vp dlx astro build
vp dlx astro preview > /tmp/astro-preview.log 2>&1 &
echo $! > /tmp/astro-preview.pid
sleep 5
curl -fsS http://localhost:4321/resume/txt -o /tmp/astro-resume-txt.txt
diff tests/fixtures/resume-txt-snapshot.txt /tmp/astro-resume-txt.txt
kill "$(cat /tmp/astro-preview.pid)" || true
rm -f /tmp/astro-preview.pid /tmp/astro-preview.log /tmp/astro-resume-txt.txt
```

Expected: zero diff.

- [ ] **Step 3: Verify the snapshot test still passes**

```bash
vp test tests/resume-txt.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/resume/txt.ts
git commit -m "Add TXT resume endpoint"
```

---

## Phase 7 — Netlify edge headers

### Task 19: Update `netlify.toml`

**Files:**

- Modify: `netlify.toml`

- [ ] **Step 1: Update build settings and add headers**

Replace the `[build]` block at the top of `netlify.toml`:

```toml
[build]
command = "vp run build"
publish = "dist"
```

Insert directly after the `[build]` block:

```toml
[[headers]]
  for = "/resume/txt"
  [headers.values]
    Content-Type = "text/plain; charset=UTF-8"
    Content-Disposition = 'attachment; filename="chris-klink-resume.txt"'
```

Leave all existing `[[redirects]]` blocks unchanged.

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "Update Netlify config for Astro static deploy with TXT headers"
```

---

## Phase 8 — Delete Next.js

### Task 20: Update `package.json` scripts and dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Update scripts**

Edit `package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "prepare": "vp config"
  }
}
```

(Note: `next start` is dropped — there's no static-equivalent needed; `astro preview` covers local prod-mode preview.)

- [ ] **Step 2: Remove Next.js / React dependencies**

```bash
vp remove next react react-dom @types/react @types/react-dom
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Drop Next.js and React from package.json; switch scripts to Astro"
```

### Task 21: Update `tsconfig.json`

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Replace contents**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "Use astro/tsconfigs/strict with @/* path alias"
```

### Task 22: Delete Next.js artifacts

**Files:**

- Delete: `src/app/`, `next.config.ts`, `next-env.d.ts`, `styles.d.ts`, `tsconfig.tsbuildinfo`

- [ ] **Step 1: Delete the files**

```bash
git rm -r src/app
git rm next.config.ts next-env.d.ts styles.d.ts
git rm -f tsconfig.tsbuildinfo  # may not be tracked — `-f` makes the rm idempotent
```

- [ ] **Step 2: Update `.gitignore`** — remove the `.next/` block

Open `.gitignore`. Remove any line(s) referencing `.next/`. Keep `dist/` and `.astro/` (added in Task 4).

- [ ] **Step 3: Re-evaluate `src/global.d.ts`**

```bash
cat src/global.d.ts
```

If the file exists and only contains JSX/CSS-module declarations that Astro provides via `astro/tsconfigs/strict`, delete it:

```bash
git rm src/global.d.ts
vp check
```

If `vp check` fails after removal, restore the file. If it passes, the deletion stands.

- [ ] **Step 4: Run full check**

```bash
vp check
vp test
vp run build
```

Expected: all three pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Delete Next.js source tree and tooling artifacts"
```

---

## Phase 9 — CI

### Task 23: Add build and test steps to CI

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add `vp run build` and `vp test`** after `vp check`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: voidzero-dev/setup-vp@v1
        with:
          cache: true
      - run: vp check
      - run: vp run build
      - run: vp test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add Astro build and test steps to CI"
```

---

## Phase 10 — Verification on Netlify

### Task 24: Deploy preview and verify edge headers

This task is manual / external. The build needs to land on Netlify before edge headers can be confirmed.

- [ ] **Step 1: Push the branch and open a PR**

```bash
git push -u origin migrate-to-astro
gh pr create --title "Migrate from Next.js to Astro" --body "$(cat <<'EOF'
## Summary
- Static-only site running on Astro 5 with @astrojs/markdoc
- Resume rendering: HTML via `<Content components={...} />`, TXT via custom Markdoc-tree walker
- /resume/txt download headers via Netlify edge `[[headers]]`
- No React, no client JS, no SSR adapter

See `docs/superpowers/specs/2026-04-28-nextjs-to-astro-migration-design.md` and `docs/superpowers/plans/2026-04-28-nextjs-to-astro-migration.md`.

## Test plan
- [ ] Snapshot test (`vp test`) green — TXT output byte-equal to pre-migration
- [ ] CI green
- [ ] Visual diff of `/resume` against current production
- [ ] Print preview matches current production
- [ ] On the deploy preview, `curl -I` of `/resume/txt` shows expected headers
- [ ] Manual click of "Resumé" link from splash on the deploy preview triggers a download

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Verify edge headers on the deploy preview**

Once Netlify finishes building the deploy preview, copy the preview URL from the PR and run:

```bash
curl -I https://<deploy-preview-url>/resume/txt
```

Expected response includes:

```
content-type: text/plain; charset=UTF-8
content-disposition: attachment; filename="chris-klink-resume.txt"
```

If headers don't appear, the `[[headers]]` block in `netlify.toml` is misconfigured or Netlify is not picking it up. Common causes: typo in `for` path (must match exactly `/resume/txt`), syntax error elsewhere in the file. Fix and push again.

- [ ] **Step 3: Visual sanity check on the deploy preview**

Open the preview in a browser. Verify:

- `/` splash matches production
- `/resume` HTML matches production (incl. fonts, layout, print styles)
- `/resume/txt` triggers a download (browser saves `chris-klink-resume.txt`)

- [ ] **Step 4: Merge when satisfied**

The PR is ready when CI is green, the snapshot test passes, and the deploy preview verification is complete.

---

## Risks and rollback

If the migration fails late (e.g., Netlify doesn't apply the headers as expected, or visual diff reveals a hard-to-fix CSS regression), the rollback is `git revert` on the merge commit — Next.js was working before this branch existed. Because the Markdoc source moved to `src/content/resume/resume.mdoc` partway through, a revert needs to either restore the file at the old path (`resume.markdoc.md`) or revert the file-move commit specifically. Resolve by checking out the file at its old path and committing.

---

## Success criteria

- [ ] `vp check` passes
- [ ] `vp test` passes (snapshot byte-equal)
- [ ] `vp run build` succeeds locally
- [ ] CI green on the PR
- [ ] Astro dev server (`pnpm dev`) serves all three URLs (`/`, `/resume`, `/resume/txt`) with output matching the previous Next.js behavior
- [ ] Netlify deploy preview returns expected edge headers on `/resume/txt`
- [ ] Print preview of `/resume` is visually unchanged
- [ ] No `next`, `react`, `react-dom` in `package.json`
- [ ] No `src/app/`, `next.config.ts`, `next-env.d.ts` in the tree
