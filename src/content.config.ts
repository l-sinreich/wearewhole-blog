/**
 * src/content.config.ts
 *
 * Defines the `whitepaper` content collection — the living white paper.
 *
 * Each section of the white paper is one .mdx file in src/content/whitepaper/.
 * The files are version-controlled in git, so every edit to the prose is a
 * real, timestamped, attributable diff. The `changelog` array in each file's
 * frontmatter is the EDITORIAL record (what changed and why) that surfaces on
 * the page via <SectionHistory> and aggregates into /whitepaper/changelog.
 *
 * Why a content collection (and not Notion)? The white paper is a deliberate,
 * infrequently-edited document whose whole premise is transparent provenance.
 * Git already IS a transparent change-tracking system. Signals — which change
 * often and are lightweight — stay in Notion (see src/lib/notion.ts).
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * One entry in a section's revision history.
 * `version` + `date` render in the collapsed pill (e.g. "v1.0 · JUN 2026");
 * `type` + `note` show in the expanded list and feed the /changelog page.
 */
const changelogEntry = z.object({
  version: z.string(),                 // "1.0", "1.1", "2.0"
  date: z.string(),                    // ISO date, e.g. "2026-06-01"
  type: z.enum(['published', 'revised', 'added', 'corrected', 'retired']),
  note: z.string(),                    // one-line description of the change
});

const whitepaper = defineCollection({
  // Glob loader: pick up every .mdx file in the whitepaper content folder.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/whitepaper' }),
  schema: z.object({
    // How the page renders this entry:
    //   header  → the title block (eyebrow + title + dek + document pill)
    //   section → a framing section (two-column: title left, prose right)
    //   inquiry → a numbered line of inquiry (two-column, numbered)
    //   closer  → full-width prose with no section title
    kind: z.enum(['header', 'section', 'inquiry', 'closer']).default('section'),
    title: z.string(),                 // section heading (left rail) / doc title
    order: z.number(),                 // controls section sequence on the page

    // Header-only fields.
    eyebrow: z.string().optional(),    // "A living white paper by WHOLE…"
    dek: z.string().optional(),        // one-line standfirst under the title
    // Optional HTML version of the title for controlled line breaks (<br>).
    // The <br>s collapse on narrow screens so the title wraps naturally.
    titleHtml: z.string().optional(),
    // Optional epigraph rendered in the section's LEFT column (accent voice).
    epigraph: z.string().optional(),
    epigraphCite: z.string().optional(),

    // Inquiries are numbered ("1.", "2."); framing sections are not.
    inquiryNumber: z.number().optional(),
    // Sections with a dotLabel get a dot in the left scroll-spy tracker.
    dotLabel: z.string().optional(),

    // Version pill — only sections that carry a version render <SectionHistory>.
    version: z.string().optional(),    // "1.0"
    versionDate: z.string().optional(),// ISO date of the current version
    // Full revision history, newest first. One entry = no toggle is shown.
    changelog: z.array(changelogEntry).default([]),
  }),
});

export const collections = { whitepaper };
