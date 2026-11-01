import { z } from 'zod';
import { DEFAULT_PROVIDERS } from './config';
const webUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      return ['https:', 'http:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  });
export const SettingsSchema = z.object({
  accent: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .default('#9cae87'),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  search: z.enum(['duckduckgo', 'brave', 'startpage', 'searxng']).default('duckduckgo'),
  searx: webUrl.default('https://search.example.org/search'),
  suspendMinutes: z.number().min(1).max(240).default(10),
  browsingMode: z.enum(['persistent', 'session', 'strict']).default('persistent'),
  allowSessionCookies: z.boolean().default(false),
  compatibilitySites: z
    .array(z.string().regex(/^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/i))
    .max(100)
    .default([]),
  historyEnabled: z.boolean().default(false),
  sidebarSide: z.enum(['left', 'right']).default('right'),
  sidebarWidth: z.number().min(280).max(900).default(400),
  providerUnloadMinutes: z.number().min(0).max(240).default(0),
  providers: z
    .array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        name: z.string().min(1).max(60),
        url: webUrl,
        icon: z.string().max(8).default('◈'),
      }),
    )
    .max(30)
    .refine((p) => new Set(p.map((v) => v.id)).size === p.length)
    .default(DEFAULT_PROVIDERS),
  videoExclusions: z
    .array(z.string().regex(/^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/i))
    .max(100)
    .default(['youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'youtube-nocookie.com']),
  wallpaper: z
    .object({
      kind: z.enum(['gradient', 'solid', 'image']).default('gradient'),
      color: z
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .default('#182321'),
      image: z.string().max(4096).default(''),
      blur: z.number().min(0).max(30).default(0),
      dim: z.number().min(0).max(0.9).default(0.25),
    })
    .default({ kind: 'gradient', color: '#182321', image: '', blur: 0, dim: 0.25 }),
  music: z
    .object({
      paths: z.array(z.string().max(4096)).max(500).default([]),
      remember: z.boolean().default(false),
      volume: z.number().min(0).max(1).default(0.5),
      loop: z.boolean().default(false),
      shuffle: z.boolean().default(false),
    })
    .default({ paths: [], remember: false, volume: 0.5, loop: false, shuffle: false }),
});
export type Settings = z.infer<typeof SettingsSchema>;
export function defaults(): Settings {
  return SettingsSchema.parse({});
}
