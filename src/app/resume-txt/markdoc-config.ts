import { Config } from "@markdoc/markdoc";
import { baseConfig } from "../resume/markdoc-config-base";

// Markdoc configuration for custom tags and nodes
// Extends base config with heading node for text output
export const config: Config = {
  ...baseConfig,
  nodes: {
    ...baseConfig.nodes,
    heading: {
      render: "Heading",
      attributes: {
        level: { type: Number, required: true },
      },
    },
  },
};
