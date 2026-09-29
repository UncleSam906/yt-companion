import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import cfg from './generated/site-config.mjs';

const base = cfg.__contentDir;

const link = z.object({
  label: z.string(),
  url: z.string(),
  note: z.string().optional(),
  image: z.string().optional(),
  cta: z.string().optional(),
  affiliate: z.boolean().default(true),
});

const chapter = z.object({ time: z.union([z.string(), z.number()]).transform(String), title: z.string() });

const common = {
  title: z.string(),
  description: z.string().default(''),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  seoTitle: z.string().optional(),
  image: z.string().optional(),
  linksLeft: z.array(link).default([]),
  linksRight: z.array(link).default([]),
  linksMode: z.enum(['merge', 'replace']).default('merge'),
  ads: z.boolean().default(true),
  affiliateBanner: z.object({ text: z.string().optional(), label: z.string().optional(), url: z.string().optional() }).optional(),
};

const videos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: `${base}/videos` }),
  schema: z.object({
    ...common,
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'youtubeId must be an 11-character YouTube id'),
    duration: z.union([z.string(), z.number()]).transform(String).optional(),
    playlists: z.array(z.string()).default([]),
    chapters: z.array(chapter).default([]),
    featured: z.boolean().default(false),
    transcript: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: `${base}/posts` }),
  schema: z.object({
    ...common,
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
    author: z.string().optional(),
  }),
});

const playlists = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: `${base}/playlists` }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    youtubePlaylistId: z.string().optional(),
    order: z.number().default(100),
    videos: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});

export const collections = { videos, posts, playlists };
