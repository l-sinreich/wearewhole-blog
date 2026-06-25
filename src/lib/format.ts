/**
 * src/lib/format.ts
 *
 * Small date-formatting helpers shared across the white paper components.
 * Dates in frontmatter and Notion are ISO strings ("2026-06-01"); these turn
 * them into the human forms the design uses. We parse with a noon suffix so a
 * date never shifts a day backward due to UTC timezone interpretation.
 */

function parse(iso: string): Date {
  // Append midday so "2026-06-01" doesn't roll back to May 31 in negative-UTC
  // timezones — the same guard the blog uses for post dates.
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

/** "2026-06-01" → "JUN 2026" (used in version pills). */
export function monthYearUpper(iso: string): string {
  if (!iso) return '';
  return parse(iso)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    .toUpperCase();
}

/** "2026-06-01" → "Jun 2026" (used in changelog lines and the signals feed). */
export function monthYear(iso: string): string {
  if (!iso) return '';
  return parse(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** "2026-06-01" → "2026-06-01" kept as-is, but flush date for the terminal log. */
export function isoDate(iso: string): string {
  if (!iso) return '';
  return parse(iso).toISOString().slice(0, 10);
}
