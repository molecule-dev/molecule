/**
 * Minimal HTML sanitizer for oEmbed `html` payloads.
 *
 * oEmbed providers return arbitrary `<iframe>`/`<blockquote>` markup
 * that consumers are expected to drop into the page. We never trust
 * that markup verbatim — at minimum, `<script>` tags and `on*` event
 * handler attributes have to go. This sanitizer is intentionally
 * regex-based and conservative: it strips known-dangerous shapes and
 * leaves everything else alone.
 *
 * Callers that need a real DOM-aware sanitizer (allow-list policies,
 * CSS sanitization) should run the output through one — this module
 * is the floor, not the ceiling.
 *
 * @module
 */

/**
 * Strip dangerous constructs from an oEmbed `html` payload.
 *
 * Removes:
 *
 * - `<script>...</script>` blocks (any case, with or without
 *   attributes).
 * - Self-closing `<script ... />` and unclosed `<script ...>` tags.
 * - `on*=` event-handler attributes (`onclick`, `onload`, …) on any
 *   element, regardless of quoting style.
 * - `javascript:` URLs in `href` and `src` attributes.
 *
 * @param html - Raw HTML from an oEmbed response.
 * @returns Sanitized HTML safe to render.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  let out = html

  // 1. Drop full <script>...</script> blocks (greedy across newlines).
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')

  // 2. Drop dangling/self-closing <script ...> tags that didn't have a
  //    closing tag (already handled the paired form above).
  out = out.replace(/<script\b[^>]*\/?>/gi, '')

  // 3. Strip on*= event-handler attributes. Three quoting variants:
  //    on*="..."  on*='...'  on*=bareword
  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')

  // 4. Neutralize javascript: URLs in href/src.
  out = out.replace(
    /(\s(?:href|src)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi,
    (_match, prefix: string, quote: string) => `${prefix}${quote}about:blank${quote}`,
  )
  out = out.replace(
    /(\s(?:href|src)\s*=\s*)javascript:[^\s>]+/gi,
    (_match, prefix: string) => `${prefix}about:blank`,
  )

  return out
}
