// src/lib/resume/text-components.ts
import { type TextComponent, wrapWithPrefix } from "./render-text";

export const Intro: TextComponent = (_attrs, children, render) => `\n\n${render(children)}\n\n`;

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
  let tail = "\n\n\n";
  return `${title ? `${title}\n` : ""}${dates ? `${dates}\n` : ""}${orgLine ? `${orgLine}\n` : ""}${body ? `\n${body}` : ""}${tail}`;
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
  if (attrs.level === 2) return `\n\n\n\n--- ${text} ---\n\n\n`;
  return `${render(children)}\n\n`;
};
