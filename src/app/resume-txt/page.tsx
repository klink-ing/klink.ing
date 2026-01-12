import * as React from "react";
import * as fs from "fs";
import * as path from "path";
import Markdoc from "@markdoc/markdoc";
import { Metadata } from "next/types";
import { config } from "./markdoc-config";
import { Stint, BulletList, List, SkillsSection } from "./markdoc-components";

// Component mapping for Markdoc
const components = {
  Stint,
  BulletList,
  SkillsSection,
  List,
  Heading: (
    props: React.HTMLAttributes<HTMLHeadingElement> & { level: number }
  ) => {
    if (props.level <= 3) {
      return <>{props.children?.toString().toUpperCase() + "\n\n"}</>;
    }
    <>
      {props.children}
      {"\n\n"}
    </>;
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
      {rendered}
    </article>
  );
};

export const metadata: Metadata = {
  title: "Klink - Resumé",
  description: "What's Klink been up to?",
};

export default Resume;
