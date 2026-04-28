// Type declarations for Astro virtual modules
declare module "astro:content" {
  import type {
    ImageFunction,
    DataEntry,
    DataStore,
    MetaStore,
    BaseSchema,
    SchemaContext,
  } from "astro/content/config";
  import type { z as zod } from "astro/zod";

  export type { ImageFunction, DataEntry, DataStore, MetaStore, BaseSchema, SchemaContext };
  export { defineCollection } from "astro/content/config";

  export const z: typeof zod;
  export function getEntryBySlug(...args: any[]): any;
  export function getDataEntryById(...args: any[]): any;
  export function getCollection(...args: any[]): any;
  export function getEntry(...args: any[]): any;
  export function getEntries(...args: any[]): any;
  export function reference(...args: any[]): any;
  export function render(entry: any): any;
  export function getLiveCollection(...args: any[]): any;
  export function getLiveEntry(...args: any[]): any;

  export type CollectionKey = any;
  export type CollectionEntry<C> = any;
  export type ContentCollectionKey = any;
  export type DataCollectionKey = any;
  export type ContentConfig = any;
}

declare module "astro/loaders" {
  export function glob(options: { pattern: string; base: string }): any;
}
