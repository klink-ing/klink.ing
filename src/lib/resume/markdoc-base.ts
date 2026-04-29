// src/lib/resume/markdoc-base.ts
import Markdoc, { type Config, type Node } from "@markdoc/markdoc";

const addListAttributes = (node: Node, attrs: Record<string, unknown>): void => {
  if (!node.children.length) {
    return;
  }
  node.children.forEach((child) => {
    if (child.type === "list") {
      child.attributes = { ...child.attributes, ...attrs };
      return;
    }
    addListAttributes(child, attrs);
  });
};

export const baseConfig: Config = {
  tags: {
    intro: { render: "Intro", attributes: {} },
    stint: {
      render: "Stint",
      attributes: {
        title: { type: String, required: true },
        start: { type: String },
        end: { type: String },
        location: { type: String, required: true },
        organization: { type: String, required: true },
        url: { type: String },
        pageBreak: { type: Boolean },
      },
    },
    skillsSection: {
      render: "SkillsSection",
      attributes: {},
      transform(node, config) {
        addListAttributes(node, { listType: "compact" });
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);
        const tag = (config.tags?.skillsSection?.render ?? "SkillsSection") as string;
        return new Markdoc.Tag(tag, attributes, children);
      },
    },
    pageBreak: { render: "PageBreak", attributes: {}, selfClosing: true },
  },
  nodes: {
    list: {
      render: "List",
      attributes: {
        ordered: { type: Boolean },
        marker: { type: String },
        listType: { type: String },
      },
    },
  },
};
