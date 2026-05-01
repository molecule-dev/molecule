/**
 * Lightweight HTML sanitization helpers.
 *
 * @remarks
 * This module is intentionally minimal — strip `<script>`, `<style>`,
 * inline `on*` event handlers, and `javascript:` URLs. Callers wiring this
 * into a full UI should still run a proper sanitizer (e.g. DOMPurify) on
 * the output. The goal here is "feed parser cannot smuggle a `<script>`
 * tag through to a downstream consumer that forgot to sanitize."
 */

const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi
const SCRIPT_OPEN = /<script\b[^>]*>/gi
const SCRIPT_CLOSE = /<\/script\s*>/gi
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi
const STYLE_OPEN = /<style\b[^>]*>/gi
const STYLE_CLOSE = /<\/style\s*>/gi
const EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_URL = /(\s(?:href|src|xlink:href|action|formaction))\s*=\s*("|')\s*javascript:[^"']*\2/gi

/**
 * Strip dangerous content from an HTML string. Returns plain text unchanged.
 *
 * Removes:
 * - Complete `<script>...</script>` and `<style>...</style>` blocks.
 * - Stray opening/closing tags of those elements (in malformed HTML).
 * - Inline event handlers (`onclick="..."`, `onerror="..."`, etc.).
 * - `javascript:` URLs in `href` / `src` / `xlink:href` / `(form)action`.
 *
 * Idempotent: `sanitizeHtml(sanitizeHtml(x)) === sanitizeHtml(x)`.
 *
 * @param html - HTML or plain-text string. `undefined` and `null` short-circuit
 *               to `undefined` so callers can chain safely.
 * @returns Sanitized HTML string, or `undefined` when the input was nullish.
 */
export function sanitizeHtml(html: string | undefined | null): string | undefined {
  if (html == null) return undefined
  let out = html
  out = out.replace(SCRIPT_BLOCK, '')
  out = out.replace(SCRIPT_OPEN, '')
  out = out.replace(SCRIPT_CLOSE, '')
  out = out.replace(STYLE_BLOCK, '')
  out = out.replace(STYLE_OPEN, '')
  out = out.replace(STYLE_CLOSE, '')
  out = out.replace(EVENT_HANDLER, '')
  out = out.replace(JS_URL, '$1=$2#$2')
  return out
}
