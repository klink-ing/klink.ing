import { Config } from "@markdoc/markdoc";

// Markdoc configuration for custom tags and nodes
export const config: Config = {
  tags: {
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
    bulletList: {
      render: "BulletList",
      attributes: {},
    },
    skillsSection: {
      render: "SkillsSection",
      attributes: {},
    },
  },
  nodes: {
    list: {
      render: "List",
      attributes: {
        ordered: { type: Boolean },
      },
    },
  },
};
