import Markdoc from "@markdoc/markdoc";
import type { Metadata } from "next/types";
import * as React from "react";
import Logo from "../../components/Logo";
import {
  createConfigWithFrontmatter,
  extractGithubUsername,
  getResumeAstAndFrontmatter,
} from "../utils";
import { List, SkillsSection, Stint } from "./markdoc-components";
import { config } from "./markdoc-config";
import styles from "./resume.module.scss";

// Component mapping for Markdoc
const components = {
  Stint,
  SkillsSection,
  List,
};

// Server component - no client-side rendering needed
const Resume = () => {
  const { ast, frontmatter } = getResumeAstAndFrontmatter();
  const configWithFrontmatter = createConfigWithFrontmatter(config, frontmatter);
  const content = Markdoc.transform(ast, configWithFrontmatter);

  // Render the entire content - Markdoc will handle the structure
  const rendered = Markdoc.renderers.react(content, React, { components });

  // Create header from frontmatter
  // Extract GitHub username from URL
  const githubUsername = extractGithubUsername(frontmatter.github);

  const header = (
    <header>
      <Logo className={styles.printLogo} />
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
      {rendered}
    </article>
  );
};

export const metadata: Metadata = {
  title: "Klink - Resumé",
  description: "What’s Klink been up to?",
};

export default Resume;
