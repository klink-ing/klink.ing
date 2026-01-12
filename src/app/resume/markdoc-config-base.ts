import { Config } from "@markdoc/markdoc";

// Base Markdoc configuration shared between resume and resume-txt
// This contains the common tags and nodes
export const baseConfig: Config = {
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
