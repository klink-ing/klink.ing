// src/lib/resume/md-components.ts
import type { RenderableTreeNode, Tag } from "@markdoc/markdoc";
import { type TextComponent, isTag } from "./render-text";

export const Intro: TextComponent = (_attrs, children, render) => {
  const text = render(children).trim();
  return `\n\n${text}\n\n`;
};

export const Stint: TextComponent<{
  title: string;
  start?: string;
  end?: string;
  location: string;
  organization: string;
  url?: string;
}> = (attrs, children, render) => {
  const title = attrs.title.trim();
  const dates =
    attrs.start && attrs.end
      ? `${attrs.start.trim()} – ${attrs.end.trim()}`
      : (attrs.start ?? attrs.end ?? "").trim();
  const heading = `### ${title}${dates ? ` — ${dates}` : ""}`;
  const org = attrs.organization.trim();
  const orgLink = attrs.url?.trim() ? `[${org}](${attrs.url.trim()})` : org;
  const location = attrs.location?.trim();
  const orgLine = location ? `${orgLink}, ${location}` : orgLink;
  const body = render(children).trim();
  return `\n\n${heading}\n\n${orgLine}\n\n${body ? `${body}\n\n` : ""}`;
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
      const heading = render([child])
        .trim()
        .replace(/^#+\s*/, "");
      const items = next.children
        .filter((c): c is Tag => isNamed(c, "li") && isTag(c))
        .map((li) => render(li.children).trim());
      out.push(`**${heading}:** ${items.join(", ")}\n\n`);
      i++;
    } else {
      out.push(render([child]));
    }
  }
  return out.join("");
};

export const List: TextComponent<{ listType?: "bullet" | "compact" }> = (attrs, children, render) =>
  attrs.listType === "compact" ? `${render(children)}\n\n` : `${render(children)}\n`;

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
    return `${attrs.index}. ${text}\n`;
  }
  return `- ${text}\n`;
};

export const PageBreak: TextComponent = () => "";

export const Heading: TextComponent<{ level: number }> = (attrs, children, render) => {
  const text = render(children).trim();
  const prefix = "#".repeat(attrs.level);
  return `\n\n${prefix} ${text}\n\n`;
};
