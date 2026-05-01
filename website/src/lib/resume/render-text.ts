// src/lib/resume/render-text.ts
import Markdoc, { type RenderableTreeNode, type Tag } from "@markdoc/markdoc";

export type TextRender = (node: RenderableTreeNode | RenderableTreeNode[]) => string;

export type TextComponent<Attrs = Record<string, unknown>> = (
  attrs: Attrs,
  children: RenderableTreeNode[],
  render: TextRender,
) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TextComponents = Record<string, TextComponent<any>>;

export const isTag = (node: RenderableTreeNode): node is Tag =>
  typeof node === "object" && node !== null && "name" in node && "attributes" in node;

/**
 * Walks the tree and pushes context attributes onto direct `li` children of
 * every `List` Tag so the generic Li renderer can pick its format without
 * needing parent-pointer access.
 */
function decorateLis(node: RenderableTreeNode): RenderableTreeNode {
  if (typeof node !== "object" || node === null) {
    return node;
  }
  if (!isTag(node)) {
    return node;
  }
  if (node.name === "List") {
    const liChildren = node.children.filter((c) => isTag(c) && c.name === "li");
    const total = liChildren.length;
    let index = 0;
    const newChildren = node.children.map((c) => {
      if (isTag(c) && c.name === "li") {
        index++;
        return new Markdoc.Tag(
          "li",
          {
            ...c.attributes,
            listType: node.attributes.listType ?? "bullet",
            ordered: Boolean(node.attributes.ordered),
            index,
            last: index === total,
          },
          c.children.map(decorateLis),
        );
      }
      return decorateLis(c);
    });
    return new Markdoc.Tag(node.name, node.attributes, newChildren);
  }
  return new Markdoc.Tag(node.name, node.attributes, node.children.map(decorateLis));
}

const joinCollapsed = (parts: string[]): string => {
  let result = "";
  for (const next of parts) {
    if (!result) {
      result = next;
    } else {
      const trailing = /\n*$/.exec(result)![0].length;
      const leading = /^\n*/.exec(next)![0].length;
      const merged = "\n".repeat(Math.max(trailing, leading));
      result = result.slice(0, result.length - trailing) + merged + next.slice(leading);
    }
  }
  return result;
};

export function renderText(tree: RenderableTreeNode, opts: { components: TextComponents }): string {
  const decorated = decorateLis(tree);
  const render: TextRender = (node) => {
    if (Array.isArray(node)) {
      return joinCollapsed(node.map(render));
    }
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }
    if (!isTag(node)) {
      return "";
    }
    const component = opts.components[node.name];
    if (component) {
      return component(node.attributes, node.children, render);
    }
    // Native HTML tag passthrough — emit children only, drop wrapper.
    return render(node.children);
  };
  return render(decorated);
}

/**
 * Wraps a comma-separated list of items to `lineLength`, keeping each item
 * intact (so multi-word items like "Tailwind CSS" never split mid-item).
 * `prefix` starts the first line; continuation lines start with `indent`.
 */
export function wrapItems(
  prefix: string,
  items: string[],
  indent: string,
  lineLength: number,
): string {
  if (items.length === 0) {
    return prefix ? `${prefix}\n` : "";
  }
  const lines: string[] = [];
  let current = prefix;
  for (let i = 0; i < items.length; i++) {
    const piece = i === items.length - 1 ? items[i] : `${items[i]}, `;
    const lineHasContent = current.trimStart().length > 0;
    if (current.length + piece.length > lineLength && lineHasContent) {
      lines.push(`${current.trimEnd()}\n`);
      current = indent + piece;
    } else {
      current += piece;
    }
  }
  if (current.trimStart().length > 0) {
    lines.push(`${current}\n`);
  }
  return lines.join("");
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
  if (!text) {
    return "";
  }
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return "";
  }
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
  if (lineHasWords) {
    lines.push(`${currentLine}\n`);
  }
  return lines.join("");
}
