import { describe, expect, it } from 'vitest'

import { diffLineCount } from '../line-diff.js'

describe('diffLineCount', () => {
  it('returns zero for identical arrays', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({ added: 0, removed: 0 })
  })

  it('reports a same-length replacement as +1/−1, not 0/0', () => {
    // The m141 shape: one line replaced by another, so the count delta is zero
    // while the file really changed.
    const before = [
      'export function ArticlePreview({ article }: { article: Article }) {',
      '  return (',
      '    <button>',
      "      {article.favoriteLabel ?? 'Favorite'}",
      '    </button>',
      '  )',
      '}',
    ]
    const after = before.map((line) =>
      line === "      {article.favoriteLabel ?? 'Favorite'}"
        ? "      {article.favorited ? 'Unfavorite' : 'Favorite'}"
        : line,
    )
    expect(after.length).toBe(before.length)
    expect(diffLineCount(before, after)).toEqual({ added: 1, removed: 1 })
  })

  it('counts added lines', () => {
    expect(diffLineCount(['a'], ['a', 'b', 'c'])).toEqual({ added: 2, removed: 0 })
  })

  it('counts removed lines', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['a'])).toEqual({ added: 0, removed: 2 })
  })

  it('counts both added and removed', () => {
    expect(diffLineCount(['a', 'b'], ['b', 'c'])).toEqual({ added: 1, removed: 1 })
  })

  it('handles completely different content', () => {
    expect(diffLineCount(['a', 'b'], ['c', 'd'])).toEqual({ added: 2, removed: 2 })
  })

  it('handles empty arrays on either side', () => {
    expect(diffLineCount([], ['a', 'b'])).toEqual({ added: 2, removed: 0 })
    expect(diffLineCount(['a', 'b'], [])).toEqual({ added: 0, removed: 2 })
    expect(diffLineCount([], [])).toEqual({ added: 0, removed: 0 })
  })

  it('handles interleaved changes', () => {
    expect(diffLineCount(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'y'])).toEqual({
      added: 2,
      removed: 2,
    })
  })

  it('handles duplicate lines', () => {
    expect(diffLineCount(['a', 'a', 'a'], ['a', 'a'])).toEqual({ added: 0, removed: 1 })
  })

  it('counts a moved line as added and removed, not as unchanged', () => {
    expect(diffLineCount(['a', 'b', 'c'], ['b', 'c', 'a'])).toEqual({ added: 1, removed: 1 })
  })

  it('stays exact on a large file with a small edit in the middle', () => {
    const oldLines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const newLines = [...oldLines]
    newLines[1500] = 'line 1500 edited'
    newLines.splice(1501, 0, 'inserted')
    expect(diffLineCount(oldLines, newLines)).toEqual({ added: 2, removed: 1 })
  })

  it('never reports a capped reordering as unchanged', () => {
    // 3000 × 3000 lines is above the exact-table cap, so the patience path
    // answers — and it must respect order: counting shared lines as a multiset
    // would find all 3000 on both sides and report a moved block as 0/0.
    const oldLines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const newLines = [...oldLines.slice(1500), ...oldLines.slice(0, 1500)]
    expect(diffLineCount(oldLines, newLines)).toEqual({ added: 1500, removed: 1500 })
  })
})
