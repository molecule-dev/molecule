import { describe, expect, it } from 'vitest'

import { buildRows, defaultShownKinds } from '../rows.js'
import type { MarginNote, MarginNotesBlock } from '../types.js'

const b = (id: string, noteIds?: string[]): MarginNotesBlock => ({ id, content: id, noteIds })
const n = (id: string, kind = 'summary'): MarginNote => ({ id, kind, content: id })

describe('buildRows', () => {
  it('groups a run of blocks that share the same notes into one row, the note once', () => {
    const rows = buildRows([b('p1', ['s']), b('p2', ['s']), b('p3', ['s'])], [n('s')])
    expect(rows).toHaveLength(1)
    expect(rows[0].blocks.map((x) => x.id)).toEqual(['p1', 'p2', 'p3'])
    expect(rows[0].notes.map((x) => x.id)).toEqual(['s'])
  })

  it('keeps a section in one row while its summary covers it, and never repeats a note', () => {
    // Every block of the section refers to its summary s; the prompts change
    // paragraph by paragraph. One row, so s stays pinned through the section.
    const rows = buildRows(
      [
        b('h', ['s']),
        b('p1', ['s', 'q1']),
        b('p2', ['s', 'q2']),
        b('p3', ['s', 'q1']),
        b('x', ['t']),
      ],
      [n('s'), n('t'), n('q1', 'prompt'), n('q2', 'prompt')],
    )
    expect(rows.map((r) => r.blocks.map((x) => x.id))).toEqual([['h', 'p1', 'p2', 'p3'], ['x']])
    expect(rows.map((r) => r.notes.map((x) => x.id))).toEqual([['s', 'q1', 'q2'], ['t']])
    // the phone panel knows every note the row refers to
    expect([...rows[0].noteIds].sort()).toEqual(['q1', 'q2', 's'])
  })

  it('treats note order as irrelevant and ignores ids with no note', () => {
    const rows = buildRows([b('p1', ['a', 'b', 'ghost']), b('p2', ['b', 'a'])], [n('a'), n('b')])
    expect(rows).toHaveLength(1)
    expect(rows[0].noteIds).toEqual(['a', 'b'])
  })

  it('keeps consecutive note-less blocks together', () => {
    const rows = buildRows([b('p1'), b('p2'), b('p3', ['s']), b('p4')], [n('s')])
    expect(rows.map((r) => r.blocks.length)).toEqual([2, 1, 1])
  })
})

describe('defaultShownKinds', () => {
  it('shows kinds unless they default off', () => {
    expect(
      defaultShownKinds([
        { id: 'summary', defaultOn: true },
        { id: 'prompt', defaultOn: false },
        { id: 'aside' },
      ]),
    ).toEqual(['summary', 'aside'])
  })
})
