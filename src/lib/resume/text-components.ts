// src/lib/resume/text-components.ts
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
