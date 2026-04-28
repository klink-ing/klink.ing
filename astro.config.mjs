// astro.config.mjs
import { defineConfig } from "astro/config";
import markdoc from "@astrojs/markdoc";

export default defineConfig({
  integrations: [
    markdoc(),
    {
      name: "resume-txt-route",
      hooks: {
        "astro:config:setup"({ injectRoute }) {
          // Inject the /resume/txt endpoint from outside src/pages/ so that
          // Next.js (which also scans src/pages/) does not pick it up as a
          // Pages Router route and conflict with the App Router at /resume/txt.
          injectRoute({
            pattern: "/resume/txt",
            entrypoint: "src/lib/resume/txt-endpoint.ts",
          });
        },
      },
    },
  ],
  vite: {
    ssr: {
      noExternal: ["@markdoc/markdoc"],
    },
  },
});
