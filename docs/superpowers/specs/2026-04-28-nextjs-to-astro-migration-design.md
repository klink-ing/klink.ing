# Next.js → Astro Migration Design

**Date:** 2026-04-28
**Status:** Approved (pending spec review)

## Goal

Convert this site from Next.js 16 (App Router, fully server-rendered) to Astro
5 with fully static output. The site has no client interactivity and no
business being a dynamic Node.js app. The migration must preserve:

1. The existing URLs (`/`, `/resume`, `/resume/txt`).
2. Markdoc-driven resume rendering with custom tags
   (`stint`, `intro`, `skillsSection`, `pageBreak`, `list`).
3. The plain-text resume served from `/resume/txt` with custom headers
   (`Content-Type: text/plain; charset=UTF-8` and
   `Content-Disposition: attachment; filename="chris-klink-resume.txt"`).
4. The visual design — same CSS, same DOM-shape resume.

## Non-goals

- No new features. No content changes to the resume itself.
- No client-side JavaScript. The site stays fully static.
- No CSS rewrite. CSS Modules carry over verbatim.
- No SSR or Netlify adapter — pure static `dist/` deploy.

## High-level approach

- **Astro 5, static output, no adapter.** `astro build` emits a static `dist/`
  that Netlify serves as files.
- **Official `@astrojs/markdoc` integration** for the HTML resume. The resume
  source lives in a content collection (`src/content/resume/resume.mdoc`); the
  HTML page renders it with `<Content components={...} />`. Custom tags map to
  Astro components.
- **Custom text walker for the TXT resume.** A static endpoint at
  `src/pages/resume/txt.ts` re-parses the same `.mdoc` source with
  `@markdoc/markdoc` directly, transforms with a _shared base config_ (no
  component bindings), and walks the resulting `RenderableTreeNode` tree
  emitting plain text. Mirrors the HTML renderer's API: a `components` map
  of `tagName → renderer function`.
- **Custom headers via Netlify.** Static deploy means the endpoint can't
  set per-response headers itself. A `[[headers]]` block in `netlify.toml`
  attaches the `Content-Type` and `Content-Disposition` headers to
  `/resume/txt` at the edge.
- **No React anywhere.** All current React components (Logo, MainMenu, the
  resume custom components) port to `.astro` files. The text-extraction
  logic that currently walks a React tree gets rewritten to walk Markdoc
  Tags directly.

## File layout

```
klinking/
├── astro.config.mjs              # NEW
├── markdoc.config.mjs            # NEW — HTML component bindings
├── netlify.toml                  # UPDATE — publish=dist, [[headers]]
├── tsconfig.json                 # UPDATE — extends astro/tsconfigs/strict
├── package.json                  # UPDATE — drop next/react/js-yaml, add astro
├── public/                       # carries over (favicon, etc.)
├── src/
│   ├── content.config.ts         # NEW — defines `resume` collection
│   ├── content/
│   │   └── resume/
│   │       └── resume.mdoc       # MOVED from /resume.markdoc.md
│   ├── layouts/
│   │   └── RootLayout.astro      # NEW — replaces app/layout.tsx
│   ├── pages/
│   │   ├── index.astro           # splash (replaces app/page.tsx)
│   │   └── resume/
│   │       ├── index.astro       # HTML resume
│   │       └── txt.ts            # static endpoint, returns text/plain body
│   ├── components/
│   │   ├── Logo.astro
│   │   ├── MainMenu.astro
│   │   └── resume/
│   │       ├── Stint.astro
│   │       ├── SkillsSection.astro
│   │       ├── List.astro
│   │       ├── Intro.astro
│   │       └── PageBreak.astro
│   ├── lib/resume/
│   │   ├── markdoc-base.ts       # shared tag/transform definitions
│   │   ├── render-text.ts        # generic walker engine + decorateLis
│   │   └── text-components.ts    # one renderer fn per HTML component + Heading + Li
│   └── styles/
│       ├── global.css            # from app/globals.css
│       ├── splash.module.css     # from app/index.module.css
│       ├── Logo.module.css
│       ├── MainMenu.module.css
│       └── resume.module.css     # from app/resume/(html)/resume.module.css
├── tests/
│   ├── fixtures/
│   │   └── resume-txt-snapshot.txt  # captured before migration starts
│   └── resume-txt.test.ts        # asserts byte-equal to fixture
└── (deleted) src/app/, next.config.ts, next-env.d.ts, styles.d.ts, tsconfig.tsbuildinfo, /resume.markdoc.md
```

## Markdoc rendering: two paths from one source

Markdoc parses the `.mdoc` body into an AST. A `Markdoc.transform(ast, config)`
call applies the config's tag/node definitions and produces a
`RenderableTreeNode` tree of `Tag` instances. The HTML and TXT paths share the
same tag/transform definitions but render the tree differently.

### Shared base — `src/lib/resume/markdoc-base.ts`

Holds the tag definitions and the `addListAttributes` helper that pushes
`listType: "compact"` onto lists nested inside skills sections. No component
references — just the data shape.

```ts
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

The `heading` node deliberately is NOT in `baseConfig`. HTML wants native
`<h2>`/`<h3>`/`<h4>`; TXT needs a Heading renderer. The TXT path adds a
`heading` node binding to the config it passes to `Markdoc.transform`.

### HTML path — `markdoc.config.mjs` + `src/pages/resume/index.astro`

`markdoc.config.mjs` wraps `baseConfig` and adds component bindings via
`@astrojs/markdoc`'s `component()` helper:

```js
import { defineMarkdocConfig, component } from "@astrojs/markdoc/config";
import { baseConfig } from "./src/lib/resume/markdoc-base.ts";

export default defineMarkdocConfig({
  ...baseConfig,
  tags: {
    intro: { ...baseConfig.tags.intro, render: component("./src/components/resume/Intro.astro") },
    stint: { ...baseConfig.tags.stint, render: component("./src/components/resume/Stint.astro") },
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
    list: { ...baseConfig.nodes.list, render: component("./src/components/resume/List.astro") },
    // heading uses native HTML rendering
  },
});
```

The page imports the entry, calls `render()`, and renders `<Content />` inside
the layout, with the frontmatter-driven header above it:

```astro
---
import { getEntry, render } from "astro:content";
import RootLayout from "@/layouts/RootLayout.astro";
import MainMenu from "@/components/MainMenu.astro";
import Logo from "@/components/Logo.astro";
import styles from "@/styles/resume.module.css";

const entry = await getEntry("resume", "resume");
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
          <li><a href={github} target="_blank">{githubUsername}@github</a></li>
          <li><a href={`mailto:${email}`}>{email}</a></li>
        </ul>
      </header>
      <Content />
    </article>
  </div>
</RootLayout>
```

The current React-tree `wrapNoBreaks` post-process (wraps `\d+–\d+` ranges in
non-breaking spans) becomes a tiny Astro helper used inside `Stint.astro` on
the date range string explicitly. No tree-walking required.

### TXT path — `src/lib/resume/render-text.ts` + `text-components.ts`

#### Engine: `renderText`

`renderText` walks a `RenderableTreeNode` tree. Components are passed in as a
map mirroring `<Content components={...} />`. Each component receives raw
child nodes plus a `render` callback (mirrors how Astro components consume
slot children — components decide whether to render, iterate, or transform
their slot contents).

```ts
import { type RenderableTreeNode, Tag } from "@markdoc/markdoc";

export type TextRender = (node: RenderableTreeNode | RenderableTreeNode[]) => string;

export type TextComponent<Attrs = Record<string, unknown>> = (
  attrs: Attrs,
  children: RenderableTreeNode[],
  render: TextRender,
) => string;

export type TextComponents = Record<string, TextComponent>;

export function renderText(tree: RenderableTreeNode, opts: { components: TextComponents }): string {
  const decorated = decorateLis(tree);
  const render: TextRender = (node) => {
    if (Array.isArray(node)) return node.map(render).join("");
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    // node is Tag
    const Component = opts.components[node.name];
    if (Component) return Component(node.attributes, node.children, render);
    // Passthrough for native HTML tags (p, em, strong, code, etc.) without
    // a registered component: emit children only — DROP the wrapper tag.
    // No "<" or ">" or HTML attributes ever appear in TXT output.
    return render(node.children);
  };
  return render(decorated);
}
```

#### Preprocessor: `decorateLis`

The custom `list` transform produces `Tag("List", { ordered, listType }, [Tag("li", {}, ...), ...])`.
Before walking, `decorateLis` recurses through the tree and pushes
`listType`, `ordered`, `index` (1-based), and `last` (boolean) onto each
direct `li` child of every `List`. This lets the generic `Li` renderer read
its own context without needing a parent reference at render time.

The decoration is TXT-only: it lives in `render-text.ts`, not in `baseConfig`.
The HTML `<Content />` therefore never sees these extra attributes and they
can't leak into rendered DOM.

```ts
function decorateLis(node: RenderableTreeNode): RenderableTreeNode {
  // - If node is an array: map decorateLis over it.
  // - If node is a Tag named "List": for each child Tag named "li",
  //   produce a new Tag with attributes augmented with
  //   { listType, ordered, index, last } and children recursively decorated.
  //   Other children pass through (recursed).
  // - Other Tags: produce a new Tag with children recursively decorated.
  // - Strings/numbers/null: returned as-is.
}
```

#### Components: `text-components.ts`

One renderer per HTML component, plus `Heading` (TXT-only) and `Li`
(generic). Each function preserves the exact whitespace/formatting of the
current React-walker output (verified by snapshot).

```ts
import type { TextComponent } from "./render-text";

export const Intro: TextComponent = (_, children, render) => `\n\n${render(children)}`;

export const Stint: TextComponent<{
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
}> = (attrs, children, render) => {
  const title = attrs.title.toUpperCase();
  const dates =
    attrs.start && attrs.end ? `${attrs.start} – ${attrs.end}` : (attrs.start ?? attrs.end ?? "");
  const orgLine =
    attrs.organization +
    (attrs.url ? ` (${attrs.url})` : "") +
    (attrs.location ? ` - ${attrs.location}` : "");
  const body = render(children).trim();
  return `${title}\n${dates}\n${orgLine}\n${body ? `\n${body}\n\n\n` : "\n\n"}`;
};

export const SkillsSection: TextComponent = (_, children, render) => render(children);

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

`wrapWithPrefix` is a private helper that word-wraps text at 80 columns
with a prefix on the first line and matching-width indent on continuations.
Direct port of the existing `splitChildrenByLines` logic, but operating
on a string rather than React children.

#### Endpoint: `src/pages/resume/txt.ts`

```ts
import { getEntry } from "astro:content";
import Markdoc from "@markdoc/markdoc";
import { baseConfig } from "@/lib/resume/markdoc-base";
import { renderText } from "@/lib/resume/render-text";
import * as components from "@/lib/resume/text-components";

export const prerender = true;

export async function GET() {
  const entry = await getEntry("resume", "resume");
  const ast = Markdoc.parse(entry.body);
  const txtConfig = {
    ...baseConfig,
    nodes: {
      ...baseConfig.nodes,
      heading: {
        render: "Heading",
        attributes: { level: { type: Number, required: true } },
      },
    },
    variables: { frontmatter: entry.data },
  };
  const tree = Markdoc.transform(ast, txtConfig);
  const { name, github, email } = entry.data;
  const header = `${name}\n${github}\n${email}\n`;
  const body = renderText(tree, { components });
  const content = (header + body).trim();
  return new Response(content);
  // Headers come from netlify.toml's [[headers]] block at the edge.
}
```

## Components

Each `.astro` component is a direct port of its `.tsx` ancestor.

- **`Logo.astro`** — inline SVG, accepts `class` prop. Uses `Logo.module.css`.
- **`MainMenu.astro`** — header nav: Logo link + "Resumé" link. Same DOM/classes.
- **`RootLayout.astro`** — `<html>`/`<head>`/`<body>` shell. Accepts `title`
  and `description` props; renders `<title>`, `<meta name="description">`,
  the Typekit `<link>`, and a `<slot />`. Imports `global.css`.
- **`Stint.astro`** — receives `title`, `start`, `end`, `organization`, `url`,
  `location`, `pageBreak`, plus a default `<slot />`. Emits the same DOM as
  the current React component. Three behaviors port over verbatim and must
  be preserved:
  1. **Education-style title splitting:** when the title contains the
     substring `" in "`, split at the first occurrence and wrap the
     second half in `<span style="white-space: nowrap">` so e.g.
     "Bachelor of Science in Computer Science" never line-breaks across
     "Computer Science". Implement in the Astro frontmatter section
     before rendering.
  2. **`noChildren` modifier class:** when no body content is provided
     (no slot content), add `styles.noChildren` alongside `styles.stint`
     on the wrapper. Use `Astro.slots.has("default")` to detect this.
  3. **No-break date ranges:** wrap `\d+–\d+` patterns in the dates
     line in a `<span class={styles.noBreak}>`. Apply directly to the
     start/end values in the Astro frontmatter — no tree walk.
- **`SkillsSection.astro`** — `<div class={styles.skillsSection}><slot /></div>`.
- **`List.astro`** — renders `<ul>` or `<ol>` based on `ordered` attr;
  picks `compactList` or `bulletList` className based on `listType`.
- **`Intro.astro`** — `<p class={styles.intro}><slot /></p>`.
- **`PageBreak.astro`** — `<div aria-hidden class={styles.pageBreak} />`.

## Configuration

### `astro.config.mjs`

```js
import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";

export default defineConfig({
  integrations: [markdoc()],
});
```

### `src/content.config.ts`

```ts
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

### `netlify.toml`

```toml
[build]
command = "vp run build"
publish = "dist"

[[headers]]
  for = "/resume/txt"
  [headers.values]
    Content-Type = "text/plain; charset=UTF-8"
    Content-Disposition = 'attachment; filename="chris-klink-resume.txt"'

# (existing redirect blocks for klink.ink, chrisklink.com/.net/.org,
# klinkmade.com, www.* → klink.ing remain verbatim)
```

### `tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### `package.json` changes

- **Remove from dependencies:** `next`, `react`, `react-dom`, `js-yaml`.
- **Remove from devDependencies:** `@types/react`, `@types/react-dom`.
- **Add to dependencies:** `astro`, `@astrojs/markdoc`. Keep `@markdoc/markdoc`.
- **Move `js-yaml` + `@types/js-yaml` to devDependencies.** They're still
  used by the snapshot test (see Verification) to parse frontmatter without
  booting Astro's content-collection loader. They are not used in any
  production page or endpoint.
- **Keep:** `vite-plus` (catalog), `tsx`, `typescript`.
- **Scripts:**
  ```json
  {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "prepare": "vp config"
  }
  ```

### `.gitignore`

Add `dist/`, `.astro/`. Remove `.next/`.

### CI (`.github/workflows/ci.yml`)

Add steps after the existing `vp check`:

```yaml
- run: vp run build
- run: vp test
```

`vp run build` catches markdoc parse errors and content-collection schema
mismatches at PR time. `vp test` runs the snapshot test.

## Tooling note: Vite+ vs framework CLIs

Per the project CLAUDE.md, `vp dev` and `vp build` always invoke Vite's
own dev/build, not framework CLIs of the same name. Astro provides its
own CLI (`astro dev`, `astro build`); to invoke it through Vite+, use
`vp run dev` and `vp run build`, which honor the `package.json`
scripts. The Netlify build command and CI step both use `vp run build`.

## Verification: byte-for-byte snapshot of TXT output

Before any migration code lands, capture the current production TXT output
as a fixture. The migration is not complete until the new pipeline produces
exactly the same bytes.

**Step 1 — Capture (on the current Next.js codebase, before changes):**

```bash
pnpm dev &
sleep 3
mkdir -p tests/fixtures
curl -sS http://localhost:3000/resume/txt > tests/fixtures/resume-txt-snapshot.txt
kill %1
```

Commit the fixture in the same change that begins the migration.

**Step 2 — Test (`tests/resume-txt.test.ts`):**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import Markdoc from "@markdoc/markdoc";
import yaml from "js-yaml"; // dev-only test dep — frontmatter not yet via collection
import { baseConfig } from "@/lib/resume/markdoc-base";
import { renderText } from "@/lib/resume/render-text";
import * as components from "@/lib/resume/text-components";

describe("resume txt output", () => {
  it("matches the pre-migration snapshot byte-for-byte", () => {
    const raw = readFileSync("src/content/resume/resume.mdoc", "utf-8");
    const ast = Markdoc.parse(raw);
    const frontmatter = yaml.load(ast.attributes.frontmatter) as {
      name: string;
      github: string;
      email: string;
    };
    const tree = Markdoc.transform(ast, {
      ...baseConfig,
      nodes: {
        ...baseConfig.nodes,
        heading: { render: "Heading", attributes: { level: { type: Number, required: true } } },
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

(The test parses the `.mdoc` directly with `js-yaml`/`Markdoc` rather than
through the content collection so it can be a unit test without booting
Astro. The endpoint at `/resume/txt` uses `getEntry` for production
rendering, but the byte-equality contract is on the rendering pipeline,
not the loader.)

If the byte-equal target reveals a bug in the current output worth fixing,
update the fixture intentionally with a noted reason in the commit message.

**HTML side:** capture a pre-migration HTML snapshot of `/resume` for
reference, but treat it as a _visual_ check rather than a byte-equal
assertion — Astro and React format HTML differently (whitespace,
attribute order), and the equivalent DOM is what matters. After
migration, manual diff in a browser at the same viewport sizes,
including the print stylesheet.

## Migration order (preview)

This is the high-level execution order; the writing-plans skill will
break each phase into checkpoints with explicit verification.

1. **Capture snapshot** of current TXT output. Commit fixture only.
2. **Scaffold Astro alongside Next.js** — install Astro/integration,
   add `astro.config.mjs`, `src/content.config.ts`, move resume to
   `src/content/resume/resume.mdoc`. Verify `astro check` passes.
3. **Build the TXT pipeline** — `markdoc-base.ts`, `render-text.ts`,
   `text-components.ts`, snapshot test. Verify byte-equal output.
4. **Build the HTML pipeline** — `markdoc.config.mjs`, `.astro`
   resume components, `src/pages/resume/index.astro`. Visual diff.
5. **Port shell pages** — `RootLayout`, `Logo`, `MainMenu`, splash
   `index.astro`. Visual diff.
6. **Wire `/resume/txt` endpoint** — `src/pages/resume/txt.ts`.
   Verify production-mode `astro build && astro preview` returns
   the right body.
7. **Update Netlify config** — `publish = "dist"`, `[[headers]]`
   block for `/resume/txt`. Verify on a Netlify deploy preview that
   the headers actually arrive (`curl -I`).
8. **Delete Next.js** — remove `src/app/`, `next.config.ts`,
   `next-env.d.ts`, `styles.d.ts`, `tsconfig.tsbuildinfo`,
   `resume.markdoc.md`, and Next/React deps from `package.json`.
   Update `tsconfig.json` and `.gitignore`. Update `package.json`
   scripts. Re-evaluate `src/global.d.ts` — Astro provides typed CSS
   Module declarations natively via `astro/tsconfigs/strict`, so
   `global.d.ts` is likely deletable; verify by running `vp check`
   after removal.
9. **Update CI** — add `vp run build` and `vp test` steps.

## Risks and mitigations

- **`@astrojs/markdoc` content collection rendering subtleties.**
  Some Markdoc transform behaviors may differ slightly between the
  React renderer and the Astro renderer. **Mitigation:** the snapshot
  test catches all TXT differences; the HTML side gets a visual diff
  before merging.
- **Whitespace drift in TXT output.** Generic `Li` rewrite may produce
  hairline spacing differences vs the current per-list-style React
  walker. **Mitigation:** snapshot test is the contract. Either match
  exactly or update the fixture intentionally.
- **Netlify static-headers caveat.** `[[headers]]` rules apply to the
  served path; if the static endpoint generates `/resume/txt` (no
  extension), Netlify serves it with a default Content-Type until the
  rule overrides. **Mitigation:** verify with `curl -I` on a deploy
  preview before merging.
- **Vite+ wrapper friction with Astro CLI.** `vp dev` and `vp build`
  invoke Vite, not Astro. **Mitigation:** use `vp run dev` /
  `vp run build`, which honor `package.json` scripts. Documented in
  the spec; CI and Netlify config both use the `vp run` form.

## Out of scope

- Adding tests for HTML rendering beyond the visual diff.
- Refactoring the resume content or schema.
- Adding new pages or features.
- Migrating away from Netlify.
- Replacing `@markdoc/markdoc` with anything else.
