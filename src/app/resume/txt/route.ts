import Markdoc from "@markdoc/markdoc";
import * as React from "react";
import {
  getResumeAstAndFrontmatter,
  createConfigWithFrontmatter,
} from "../utils";
import { config } from "./markdoc-config";
import {
  Heading,
  List,
  SkillsSection,
  Stint,
} from "./markdoc-components";

const components = {
  Stint,
  SkillsSection,
  List,
  Heading,
};

/**
 * Recursively extracts text content from a React node by executing components.
 * Handles React elements, fragments, strings, numbers, and arrays.
 */
function extractTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "number") {
    return String(node);
  }
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).join("");
  }
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement;

    // If the element type is a function (component), execute it
    if (typeof element.type === "function") {
      // Cast to function component type since our components are all functional
      const Component = element.type as (props: any) => React.ReactNode;
      const result = Component(element.props);
      return extractTextFromReactNode(result);
    }

    // Otherwise, just extract children from props
    const props = element.props as { children?: React.ReactNode };
    return extractTextFromReactNode(props.children);
  }
  return "";
}

export async function GET() {
  // 1. Parse and transform Markdoc (same as current page.tsx)
  const { ast, frontmatter } = getResumeAstAndFrontmatter(false);
  const configWithFrontmatter = createConfigWithFrontmatter(config, frontmatter);
  const transformed = Markdoc.transform(ast, configWithFrontmatter);

  // 2. Render with React (same as current page.tsx)
  const rendered = Markdoc.renderers.react(transformed, React, { components });

  // 3. Generate header from frontmatter
  const header = `${frontmatter.name}\n${frontmatter.github}\n${frontmatter.email}\n`;

  // 4. Extract text from React elements
  const body = extractTextFromReactNode(rendered);

  // 5. Return as plain text
  return new Response(header + body, {
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
    },
  });
}
