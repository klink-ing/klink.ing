// src/lib/resume/text-components.ts
import type { RenderableTreeNode, Tag } from "@markdoc/markdoc";
import { type TextComponent, isTag, wrapItems, wrapWithPrefix } from "./render-text";

const LINE_LENGTH = 80;

export const Intro: TextComponent = (_attrs, children, render) => {
  const text = render(children).trim();
  return `\n\n${wrapWithPrefix(text, "", "", LINE_LENGTH)}\n`;
};

export const Stint: TextComponent<{
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
}> = (attrs, children, render) => {
  const title = attrs.title.toUpperCase().trim();
  const dates =
    attrs.start && attrs.end
      ? `${attrs.start.trim()} – ${attrs.end.trim()}`
      : (attrs.start ?? attrs.end ?? "").trim();
  const orgLine = `${attrs.organization.trim()}${attrs.url?.trim() ? ` (${attrs.url.trim()})` : ""}${attrs.location?.trim() ? ` - ${attrs.location.trim()}` : ""}`;
  const body = render(children).trim();
  const tail = "\n\n\n";
  return `${title ? `${title}\n` : ""}${dates ? `${dates}\n` : ""}${orgLine ? `${orgLine}\n` : ""}${body ? `\n${body}` : ""}${tail}`;
};

const isNamed = (node: RenderableTreeNode, name: string) => isTag(node) && node.name === name;

const isH4 = (node: RenderableTreeNode) =>
  isNamed(node, "h4") || (isNamed(node, "Heading") && isTag(node) && node.attributes.level === 4);

export const SkillsSection: TextComponent = (_attrs, children, render) => {
  const out: string[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const next = children[i + 1];
    if (isH4(child) && next && isNamed(next, "List") && isTag(next)) {
      const heading = render([child]).replace(/\n+$/, "");
      const items = next.children
        .filter((c): c is Tag => isNamed(c, "li") && isTag(c))
        .map((li) => render(li.children).trim());
      out.push(`${wrapItems(heading, items, "  ", LINE_LENGTH)}\n`);
      i++;
    } else {
      out.push(render([child]));
    }
  }
  return out.join("");
};

export const List: TextComponent<{ listType?: "bullet" | "compact" }> = (attrs, children, render) =>
  attrs.listType === "compact" ? `${render(children)}\n\n` : render(children);

export const li: TextComponent<{
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
    return wrapWithPrefix(text, prefix, " ".repeat(prefix.length), LINE_LENGTH);
  }
  return wrapWithPrefix(text, "- ", "  ", LINE_LENGTH);
};

export const PageBreak: TextComponent = () => "";

export const Heading: TextComponent<{ level: number }> = (attrs, children, render) => {
  const text = render(children).toUpperCase();
  if (attrs.level === 4) {
    return `${text}: `;
  }
  if (attrs.level === 3) {
    return `${text}\n\n`;
  }
  if (attrs.level === 2) {
    return `\n\n\n\n--- ${text} ---\n\n\n`;
  }
  return `${render(children)}\n\n`;
};
