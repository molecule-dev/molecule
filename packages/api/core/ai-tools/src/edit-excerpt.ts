/**
 * What `edit_file` / `write_file` hand back so the model can see the result of
 * a change without reading the file again.
 *
 * Measured on X0 benchmark runs: 7–31 `read_file` calls per build re-read a
 * file the executor had just written or edited — to check the result, or to
 * find line numbers for the next edit. Each is a full model round-trip. The
 * edited region, numbered, answers both questions in the edit's own result.
 *
 * @module
 */

/** Lines of unchanged context shown above and below each edited region. */
export const EDIT_EXCERPT_CONTEXT_LINES = 3

/** Most lines an edit excerpt shows in total, across all regions. */
export const EDIT_EXCERPT_MAX_LINES = 60

/** Longest single line an excerpt shows before cutting it (minified files). */
export const EDIT_EXCERPT_MAX_LINE_CHARS = 240

/** A `write_file` result echoes the file back only when it has at most this many lines… */
export const WRITE_ECHO_MAX_LINES = 40

/** …and at most this many characters. */
export const WRITE_ECHO_MAX_CHARS = 3000

/** A half-open character range `[start, end)` in a string. */
export interface CharSpan {
  /** First changed character. */
  start: number
  /** One past the last changed character (equal to `start` for a pure deletion). */
  end: number
}

/**
 * Number of lines in a file, counted the way `read_file` counts them
 * (`split('\n').length`), so a line number from an excerpt is a valid
 * `read_file` offset. An empty file has 0 lines.
 *
 * @param content - The file text.
 * @returns The line count.
 */
export function countLines(content: string): number {
  return content === '' ? 0 : content.split('\n').length
}

/**
 * The region of `after` that differs from `before`, found by trimming the
 * common prefix and suffix. Exact for a single replacement, whatever matched it
 * (verbatim or whitespace-tolerant), which is how `edit_file` uses it.
 *
 * @param before - Text before the change.
 * @param after - Text after the change.
 * @returns The changed span in `after`, or null when the texts are equal.
 */
export function changedSpan(before: string, after: string): CharSpan | null {
  if (before === after) return null
  const max = Math.min(before.length, after.length)
  let prefix = 0
  while (prefix < max && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix++
  let suffix = 0
  while (
    suffix < max - prefix &&
    before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  )
    suffix++
  return { start: prefix, end: after.length - suffix }
}

/**
 * Fold one more change into the spans already recorded, keeping every span
 * expressed in the coordinates of the NEWEST text. Spans after the change shift
 * by its length delta; spans it overlaps merge into it.
 *
 * @param spans - Spans recorded so far, in `before` coordinates.
 * @param before - Text before this change.
 * @param after - Text after this change.
 * @returns The spans in `after` coordinates, sorted by start.
 */
export function addChangeSpan(spans: CharSpan[], before: string, after: string): CharSpan[] {
  const change = changedSpan(before, after)
  if (!change) return spans
  // The change's extent in BEFORE coordinates: same start, and the same suffix.
  const beforeEnd = before.length - (after.length - change.end)
  const delta = after.length - before.length
  let merged: CharSpan = { ...change }
  const out: CharSpan[] = []
  for (const span of spans) {
    if (span.end < change.start) out.push(span)
    else if (span.start > beforeEnd) out.push({ start: span.start + delta, end: span.end + delta })
    else
      merged = {
        start: Math.min(merged.start, span.start),
        end: Math.max(merged.end, span.end > beforeEnd ? span.end + delta : change.end),
      }
  }
  out.push(merged)
  return out.sort((a, b) => a.start - b.start)
}

/**
 * The 1-based line a character offset falls on.
 *
 * @param lineStarts - Offset of the first character of each line.
 * @param offset - A character offset into the text.
 * @returns The line number, 1-based.
 */
function lineAt(lineStarts: number[], offset: number): number {
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

/**
 * Render numbered lines `from..to` (1-based, inclusive), cutting very long lines.
 *
 * @param lines - The file's lines.
 * @param from - First line to render.
 * @param to - Last line to render.
 * @returns One `N: text` row per line.
 */
function numbered(lines: string[], from: number, to: number): string[] {
  const rows: string[] = []
  for (let n = from; n <= to; n++) {
    const text = lines[n - 1] ?? ''
    rows.push(
      `${n}: ${
        text.length > EDIT_EXCERPT_MAX_LINE_CHARS
          ? `${text.slice(0, EDIT_EXCERPT_MAX_LINE_CHARS)}… (+${text.length - EDIT_EXCERPT_MAX_LINE_CHARS} chars)`
          : text
      }`,
    )
  }
  return rows
}

/**
 * The edited regions of a file as they now read — numbered, with a few lines of
 * context, capped at {@link EDIT_EXCERPT_MAX_LINES} in total. What does not fit
 * is named by line range so the model can `read_file` exactly that window.
 *
 * @param content - The file's text after the edit.
 * @param spans - Changed character spans in `content` (from {@link addChangeSpan}).
 * @returns The excerpt text, or an empty string when there is nothing to show.
 */
export function renderEditExcerpt(content: string, spans: CharSpan[]): string {
  if (spans.length === 0 || content === '') return ''
  const lines = content.split('\n')
  const lineStarts: number[] = [0]
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') lineStarts.push(i + 1)

  // Line ranges with context, merged where they touch.
  const ranges: Array<{ from: number; to: number }> = []
  for (const span of spans) {
    const first = lineAt(lineStarts, span.start)
    const last = lineAt(lineStarts, Math.max(span.start, span.end - 1))
    const from = Math.max(1, first - EDIT_EXCERPT_CONTEXT_LINES)
    const to = Math.min(lines.length, last + EDIT_EXCERPT_CONTEXT_LINES)
    const prev = ranges[ranges.length - 1]
    if (prev && from <= prev.to + 1) prev.to = Math.max(prev.to, to)
    else ranges.push({ from, to })
  }

  let budget = EDIT_EXCERPT_MAX_LINES
  const rows: string[] = []
  const elided: string[] = []
  for (const { from, to } of ranges) {
    if (budget <= 0) {
      elided.push(from === to ? `${from}` : `${from}-${to}`)
      continue
    }
    if (rows.length > 0) rows.push('…')
    const size = to - from + 1
    if (size <= budget) {
      rows.push(...numbered(lines, from, to))
      budget -= size
      continue
    }
    // Too big for what is left: show its head and tail, name the middle.
    const head = Math.max(1, Math.ceil(budget / 2))
    const tail = Math.max(0, budget - head)
    rows.push(...numbered(lines, from, from + head - 1))
    const gapFrom = from + head
    const gapTo = to - tail
    rows.push(`… (lines ${gapFrom}-${gapTo} not shown)`)
    if (tail > 0) rows.push(...numbered(lines, gapTo + 1, to))
    budget = 0
  }
  if (elided.length > 0) {
    rows.push(`… (also edited, not shown: lines ${elided.join(', ')})`)
  }
  return rows.join('\n')
}

/**
 * A small file, numbered, for a `write_file` result — or null when the file is
 * too big to echo (the model has what it just wrote; only line numbers are new).
 *
 * @param content - The file's text as written.
 * @returns The numbered text, or null when the file is over the echo limits.
 */
export function renderSmallFile(content: string): string | null {
  const total = countLines(content)
  if (total === 0 || total > WRITE_ECHO_MAX_LINES || content.length > WRITE_ECHO_MAX_CHARS)
    return null
  return numbered(content.split('\n'), 1, total).join('\n')
}
