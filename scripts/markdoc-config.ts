import { Config } from "@markdoc/markdoc";
import React from "react";

// This config defines the schema for custom Markdoc tags

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
    contact: {
      render: "ContactLink",
      attributes: {
        href: { type: String, required: true },
        text: { type: String, required: true },
        email: { type: Boolean },
      },
    },
    bulletList: {
      render: "BulletList",
      attributes: {},
    },
    compactList: {
      render: "CompactList",
      attributes: {},
    },
  },
  nodes: {
    list: {
      render: "List",
      attributes: {
        ordered: { type: Boolean },
        className: { type: String },
      },
    },
  },
};

