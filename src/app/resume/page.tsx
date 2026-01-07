import * as React from "react";
import * as fs from "fs";
import * as path from "path";
import Markdoc from "@markdoc/markdoc";
import { Metadata } from "next/types";
import styles from "./resume.module.scss";
import { config } from "./markdoc-config";
import { Stint, BulletList, SkillsList, List } from "./markdoc-components";

// Helper function to extract sections from rendered content
function extractSections(children: React.ReactNode): {
  capabilities: React.ReactNode;
  rest: React.ReactNode;
} {
  const childrenArray = React.Children.toArray(children);
  let capabilities: React.ReactNode = null;
  const rest: React.ReactNode[] = [];

  let currentSection: string | null = null;
  let sectionContent: React.ReactNode[] = [];

  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      // Check for section wrapper containing Skills
      if (child.type === "section") {
        const sectionProps =
          child.props as React.HTMLAttributes<HTMLElement> & {
            children?: React.ReactNode;
          };
        const sectionChildren = React.Children.toArray(
          sectionProps.children || []
        );
        const h2Child = sectionChildren.find(
          (c) => React.isValidElement(c) && c.type === "h2"
        ) as
          | React.ReactElement<React.HTMLAttributes<HTMLHeadingElement>>
          | undefined;

        if (h2Child) {
          const sectionText = String(h2Child.props.children || "");
          if (sectionText === "Skills") {
            // Render Skills section as Capabilities
            capabilities = (
              <section className={styles.capabilities}>
                <h2>Capabilities</h2>
                {sectionChildren.filter((c) => {
                  // Filter out the h2 heading as we'll add it manually
                  return !(React.isValidElement(c) && c.type === "h2");
                })}
              </section>
            );
            return;
          }
        }
      }

      // Check for h2 (section headings)
      if (child.type === "h2") {
        // Save previous section
        if (currentSection === "Skills" && sectionContent.length > 0) {
          // Render Skills section as Capabilities
          capabilities = (
            <section className={styles.capabilities}>
              <h2>Capabilities</h2>
              {sectionContent.filter((item) => {
                // Filter out the h2 heading as we'll add it manually
                return !(React.isValidElement(item) && item.type === "h2");
              })}
            </section>
          );
        } else if (currentSection && sectionContent.length > 0) {
          rest.push(...sectionContent);
        }

        const sectionText = String(
          (child.props as React.HTMLAttributes<HTMLHeadingElement>).children ||
            ""
        );
        currentSection = sectionText;
        sectionContent = [child];
        return;
      }

      // Add to current section or rest
      if (currentSection === "Skills") {
        sectionContent.push(child);
      } else if (currentSection) {
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
  List,
  // Standard HTML elements
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props} />,
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
          className={
            sectionText === "Education"
              ? `${styles.education} ${restProps.className || ""}`.trim()
              : restProps.className
          }
        >
          {otherChildren}
          <ul className={styles.block}>
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

  if (!frontmatter.name || !frontmatter.github || !frontmatter.email) {
    throw new Error("Missing required frontmatter fields: name, github, email");
  }

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
    <header>
      <h1>{frontmatter.name}</h1>
      <ul>
        <li>
          <a target="_blank" href={frontmatter.github}>
            {githubUsername}@github
          </a>
        </li>
        <li>
          <a href={`mailto:${frontmatter.email}`}>{frontmatter.email}</a>
        </li>
      </ul>
    </header>
  );

  return (
    <article className={styles.resume}>
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
