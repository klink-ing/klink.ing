import * as React from "react";
import Markdoc from "@markdoc/markdoc";
import { Metadata } from "next/types";
import { config } from "./markdoc-config";
import { Heading, List, SkillsSection, Stint } from "./markdoc-components";
import {
  getResumeAstAndFrontmatter,
  createConfigWithFrontmatter,
} from "../resume/utils";

// Component mapping for Markdoc
const components = {
  Stint,
  SkillsSection,
  List,
  Heading,
};

// Server component - no client-side rendering needed
const Resume = () => {
  const { ast, frontmatter } = getResumeAstAndFrontmatter(false);
  const configWithFrontmatter = createConfigWithFrontmatter(
    config,
    frontmatter
  );
  const content = Markdoc.transform(ast, configWithFrontmatter);

  // Render the entire content - Markdoc will handle the structure
  const rendered = Markdoc.renderers.react(content, React, { components });

  const header = (
    <>
      <>
        {frontmatter.name}
        {"\n"}
      </>
      <>
        {frontmatter.github}
        {"\n"}
      </>
      <>
        {frontmatter.email}
        {"\n"}
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
  description: "What’s Klink been up to?",
};

export default Resume;
