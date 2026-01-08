import * as React from "react";
import * as fs from "fs";
import * as path from "path";
import Markdoc from "@markdoc/markdoc";
import { Metadata } from "next/types";
import { config } from "./markdoc-config";
import {
  Stint,
  BulletList,
  SkillsList,
  List,
  SkillsSection,
} from "./markdoc-components";

// Helper function to extract sections from rendered content
function extractSections(children: React.ReactNode): {
  capabilities: React.ReactNode;
  rest: React.ReactNode;
} {
  const childrenArray = React.Children.toArray(children);
  const capabilities: React.ReactNode = null;
  const rest: React.ReactNode[] = [];

  const currentSection: string | null = null;
  const sectionContent: React.ReactNode[] = [];

  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      // Check for section wrapper containing Skills

      if (currentSection) {
        sectionContent.push(child);
      } else {
        rest.push(child);
      }
    }
  });

  rest.push(...sectionContent);

  return { capabilities, rest: <>{rest}</> };
}

// Ul component - default styling (SkillsList will process its children)
const Ul: React.FunctionComponent<React.HTMLAttributes<HTMLUListElement>> = (
  props
) => {
  return <ul {...props} />;
};

// Component mapping for Markdoc
const components = {
  Stint,
  BulletList,
  SkillsList,
  SkillsSection,
  List,
  // Standard HTML elements
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <>{props.children?.toString().toUpperCase() + "\n\n"}</>
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <>{props.children?.toString().toUpperCase() + "\n"}</>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />,
  ul: Ul,
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
  article: (props: React.HTMLAttributes<HTMLElement>) => <article {...props} />,
  header: (props: React.HTMLAttributes<HTMLElement>) => <header {...props} />,
  section: (
    props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
  ) => {
    const { children, ...restProps } = props;
    const childrenArray = React.Children.toArray(children);

    // Check if this section contains stints (Experience or Education)
    const hasStints = childrenArray.some(
      (child) =>
        React.isValidElement(child) &&
        (child.type === Stint ||
          (typeof child === "object" &&
            "type" in child &&
            child.type === Stint))
    );

    // Check section type from h2 heading
    const sectionHeading = childrenArray.find(
      (child) => React.isValidElement(child) && child.type === "h2"
    ) as
      | React.ReactElement<React.HTMLAttributes<HTMLHeadingElement>>
      | undefined;
    const sectionText = sectionHeading
      ? String(sectionHeading.props.children || "")
      : "";

    if (
      hasStints &&
      (sectionText === "Experience" || sectionText === "Education")
    ) {
      const stints = childrenArray.filter(
        (child) => React.isValidElement(child) && child.type === Stint
      );
      const otherChildren = childrenArray.filter(
        (child) => !(React.isValidElement(child) && child.type === Stint)
      );

      return (
        <section
          {...restProps}
          style={
            sectionText === "Experience"
              ? { pageBreakBefore: "always", ...restProps.style }
              : restProps.style
          }
        >
          {otherChildren}
          <ul>
            {stints.map((stint, idx) => {
              // Check if this stint has pageBreak attribute
              const pageBreak =
                React.isValidElement(stint) &&
                stint.props &&
                typeof stint.props === "object" &&
                stint.props !== null &&
                "pageBreak" in stint.props &&
                (stint.props as { pageBreak?: boolean }).pageBreak === true;

              return (
                <li
                  key={idx}
                  style={pageBreak ? { pageBreakBefore: "always" } : undefined}
                >
                  {stint}
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    return <section {...props} />;
  },
};

interface Frontmatter {
  name: string;
  github: string;
  email: string;
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  markdown: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("Frontmatter not found in markdoc file");
  }

  const frontmatterText = match[1];
  const markdown = match[2];

  // Parse YAML frontmatter (simple parser for name, github, email)
  const frontmatter: Partial<Frontmatter> = {};
  frontmatterText.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line
        .substring(colonIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key === "name" || key === "github" || key === "email") {
        frontmatter[key as keyof Frontmatter] = value;
      }
    }
  });



  return {
    frontmatter: frontmatter as Frontmatter,
    markdown,
  };
}

function getResumeContent() {
  const filePath = path.join(process.cwd(), "resume.markdoc.md");
  return fs.readFileSync(filePath, "utf-8");
}

// Server component - no client-side rendering needed
const Resume = () => {
  const fileContent = getResumeContent();
  const { frontmatter, markdown } = parseFrontmatter(fileContent);

  const ast = Markdoc.parse(markdown);
  const content = Markdoc.transform(ast, config);

  // Render the entire content - Markdoc will handle the structure
  const rendered = Markdoc.renderers.react(content, React, { components });

  // Extract capabilities and rest of content (header comes from frontmatter)
  const { capabilities, rest } = extractSections(rendered);

  // Create header from frontmatter
  // Extract GitHub username from URL
  const githubUsername = frontmatter.github
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/\/$/, "");

  const header = (
    <>
      <>
        {frontmatter.name}
        {"\n"}
      </>
      <>
        {githubUsername}@github ({frontmatter.github}){"\n"}
      </>
      <>
        {frontmatter.email} ({frontmatter.email}){"\n"}
      </>
    </>
  );

  return (
    <article>
      {header}
      {capabilities}
      {rest}
    </article>
  );
};

export const metadata: Metadata = {
  title: "Klink - Resumé",
  description: "What's Klink been up to?",
};

export default Resume;
