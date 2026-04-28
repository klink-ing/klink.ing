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
