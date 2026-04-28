// markdoc.config.mjs
import { component, defineMarkdocConfig } from "@astrojs/markdoc/config";
import { baseConfig } from "./src/lib/resume/markdoc-base.ts";

export default defineMarkdocConfig({
  ...baseConfig,
  tags: {
    intro: {
      ...baseConfig.tags.intro,
      render: component("./src/components/resume/Intro.astro"),
    },
    stint: {
      ...baseConfig.tags.stint,
      render: component("./src/components/resume/Stint.astro"),
    },
    skillsSection: {
      ...baseConfig.tags.skillsSection,
      render: component("./src/components/resume/SkillsSection.astro"),
    },
    pageBreak: {
      ...baseConfig.tags.pageBreak,
      render: component("./src/components/resume/PageBreak.astro"),
    },
  },
  nodes: {
    list: {
      ...baseConfig.nodes.list,
      render: component("./src/components/resume/List.astro"),
    },
    // heading falls through to native <h1>/<h2>/<h3>/...
  },
});
