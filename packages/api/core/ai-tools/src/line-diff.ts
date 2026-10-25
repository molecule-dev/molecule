/**
 * Real added/removed LINE counts for the `diff` a file-writing tool reports.
 *
 * The count is a diff, not an arithmetic delta: replacing one line with another
 * leaves the line count unchanged, so `new.length - old.length` is 0 for the
 * edit that changed the file — a result that reads to the model as "your write
 * did nothing" — `write_file` rewrote `ArticlePreview.tsx`'s favorite label and reported
 * `"linesAdded":0,"linesRemoved":0`. The lines an edit actually changed are
 * found with the same longest-common-subsequence line diff the IDE's tool cards
 * use (`@molecule/app-ide-react`'s `diffLineCount`); it is mirrored here because
 * the API and App halves of the workspace cannot import each other (AGENTS.md
 * Rule 11, enforced by ESLint). Keep the two in step if either changes.
 *
 * @module
 */

/**
 * Largest LCS table the exact diff may build, in cells (old × new). A whole-file
 * edit can be thousands of lines per side, i.e. tens of millions of cells —
 * gigabytes of heap for a summary that only needs two numbers. Above this cap
 * the answer comes from {@link orderedCommonLines}, a provable, order-respecting
 * common subsequence in O(n log n); below it the result is exact. 1 << 22 cells
 * is a few milliseconds, and the two-row table keeps memory at O(min(old, new)).
 */
const MAX_DIFF_CELLS = 1 << 22

/**
 * Longest common subsequence length of two line arrays, in bounded time and
 * memory: two rows of the recurrence instead of the whole table, and — once the
 * table would exceed {@link MAX_DIFF_CELLS} — the order-respecting lower bound
 * from {@link orderedCommonLines}.
 *
 * @param a - The first line array.
 * @param b - The second line array.
 * @returns The common subsequence length (a lower bound for the capped inputs).
 */
function lcsLength(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  if (a.length * b.length > MAX_DIFF_CELLS) return orderedCommonLines(a, b)
  // The recurrence needs only the previous row, and a row is `cols` wide — so
  // the SHORTER array belongs on the `cols` axis, which bounds every row by
  // min(a, b) and is what the memory claim above rests on. The recurrence is
  // symmetric, so the length it returns is the same either way.
  let rows = a
  let cols = b
  if (cols.length > rows.length) {
    rows = b
    cols = a
  }
  let previous = new Array<number>(cols.length + 1).fill(0)
  let current = new Array<number>(cols.length + 1).fill(0)
  for (let i = 1; i <= rows.length; i++) {
    const line = rows[i - 1]
    for (let j = 1; j <= cols.length; j++) {
      if (line === cols[j - 1]) {
        current[j] = previous[j - 1] + 1
      } else {
        const above = previous[j]
        const left = current[j - 1]
        current[j] = above >= left ? above : left
      }
    }
    const swap = previous
    previous = current
    current = swap
  }
  return previous[cols.length]
}

/**
 * How many lines the two arrays share IN ORDER, for inputs too large for the
 * exact table: the longest run of lines that appear in the same relative order
 * on both sides, found among the lines that occur exactly once in `a` (their
 * position is unambiguous) by reducing their `b` positions to a longest
 * strictly increasing run — the standard patience LIS, O(n log n).
 *
 * Order is the whole point. Counting the lines as a multiset (order thrown
 * away) is only an UPPER bound on the LCS, so it under-reports changes: a
 * 3000-line file whose two halves were swapped shares every line, and the
 * multiset count would report the replacement as `+0 −0` — a result claiming a
 * real edit changed nothing. Every line counted here is a real in-order match,
 * so the answer is a LOWER bound on the LCS and the change count it feeds can
 * only ever be over-stated, never denied.
 *
 * @param a - The first line array.
 * @param b - The second line array.
 * @returns A common subsequence length.
 */
function orderedCommonLines(a: readonly string[], b: readonly string[]): number {
  const occurrences = new Map<string, number>()
  for (const line of a) occurrences.set(line, (occurrences.get(line) ?? 0) + 1)
  const position = new Map<string, number>()
  a.forEach((line, index) => {
    if (occurrences.get(line) === 1) position.set(line, index)
  })
  // Patience: `tails[i]` is the smallest `b`-position that ends an increasing
  // run of length `i + 1`.
  const tails: number[] = []
  for (const line of b) {
    const at = position.get(line)
    if (at === undefined) continue
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < at) lo = mid + 1
      else hi = mid
    }
    tails[lo] = at
  }
  return tails.length
}

/**
 * Count truly added/removed lines between two line arrays using LCS.
 *
 * Bounded by construction, so a whole-file edit cannot allocate a quadratic
 * table here: the longest common prefix and suffix are trimmed first (exact —
 * those lines belong to every optimal diff, and on the usual small edit they
 * shrink the table to the edited span), and what is left is capped (see
 * {@link lcsLength}).
 *
 * @param oldLines - The original lines array.
 * @param newLines - The modified lines array.
 * @returns An object with the number of added and removed lines.
 */
export function diffLineCount(
  oldLines: readonly string[],
  newLines: readonly string[],
): { added: number; removed: number } {
  const oldLength = oldLines.length
  const newLength = newLines.length
  const shared = Math.min(oldLength, newLength)
  // Longest common prefix / suffix. `suffix` is bounded by `shared - prefix`, so
  // the two trimmed runs can never overlap each other.
  let prefix = 0
  while (prefix < shared && oldLines[prefix] === newLines[prefix]) prefix++
  let suffix = 0
  while (
    suffix < shared - prefix &&
    oldLines[oldLength - 1 - suffix] === newLines[newLength - 1 - suffix]
  ) {
    suffix++
  }
  const common =
    prefix +
    suffix +
    lcsLength(
      oldLines.slice(prefix, oldLength - suffix),
      newLines.slice(prefix, newLength - suffix),
    )
  return { added: newLength - common, removed: oldLength - common }
}
