import { getViteConfig } from "astro/config";

export default getViteConfig({
  // @ts-expect-error Astro's getViteConfig type omits Vitest's `test` field
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
