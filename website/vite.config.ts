import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    categories: {
      correctness: "error",
      perf: "error",
      suspicious: "error",
      style: "error",
    },
    rules: {
      "capitalized-comments": "off",
      "sort-keys": "off",
      "no-magic-numbers": "off",
      "unicorn/filename-case": "off",
      "id-length": "off",
      "func-style": "off",
      "max-statements": "off",
      "max-params": "off",
      "no-ternary": "off",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
});
