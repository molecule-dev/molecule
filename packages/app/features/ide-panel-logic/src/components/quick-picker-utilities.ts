/**
 * The quick picker's filter (Quick Open, the Command Palette): which items a
 * query matches, and in what order.
 *
 * @module
 */

/**
 * Fuzzy-matches a query against a label: the query's characters must appear in
 * the label in order, ignoring case. Each matched character scores one more than
 * the run of matches before it (so `qo` scores higher against `quick open` than
 * against `q…o`), plus 5 when the label's first character matches.
 *
 * @param query - What the user typed.
 * @param label - An item's label.
 * @returns The score (higher is a better match), `0` for an empty query, or `-1`
 *   when the label does not contain the query's characters in order.
 */
export function fuzzyScore(query: string, label: string): number {
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  let qi = 0
  let score = 0
  let consecutive = 0

  for (let li = 0; li < l.length && qi < q.length; li++) {
    if (l[li] === q[qi]) {
      qi++
      consecutive++
      score += consecutive + (li === 0 ? 5 : 0)
    } else {
      consecutive = 0
    }
  }
  return qi === q.length ? score : -1
}
