// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

export const collections = {
  resume: defineCollection({
    loader: glob({ pattern: "**/*.mdoc", base: "./src/content/resume" }),
    schema: z.object({
      name: z.string(),
      github: z.string().url(),
      email: z.string().email(),
    }),
  }),
};
