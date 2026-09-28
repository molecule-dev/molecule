import { describe, expect, it } from 'vitest'

import { buildRows, mergeRepeatedNotes } from '../rows.js'
import type { MarginNote, MarginNotesBlock } from '../types.js'

const prompt = (id: string, text: string): MarginNote => ({
  id,
  kind: 'prompt',
  label: 'Prompt',
  html: `<q>${text}</q>`,
})
const block = (id: string, noteIds: string[]): MarginNotesBlock => ({
  id,
  html: `<p>${id}</p>`,
  noteIds,
})

describe('mergeRepeatedNotes', () => {
  it('points consecutive blocks with the same prompt at the first note', () => {
    const notes = [
      prompt('p1', 'Write the intro'),
      prompt('p2', 'Write the intro'),
      prompt('p3', 'Write the intro'),
    ]
    const blocks = [block('a', ['p1']), block('b', ['p2']), block('c', ['p3'])]
    expect(mergeRepeatedNotes(blocks, notes).map((b) => b.noteIds)).toEqual([
      ['p1'],
      ['p1'],
      ['p1'],
    ])
  })

  it('keeps a repeat after a gap as its own note', () => {
    const notes = [prompt('p1', 'Same words'), prompt('p2', 'Other'), prompt('p3', 'Same words')]
    const blocks = [block('a', ['p1']), block('b', ['p2']), block('c', ['p3'])]
    expect(mergeRepeatedNotes(blocks, notes).map((b) => b.noteIds)).toEqual([
      ['p1'],
      ['p2'],
      ['p3'],
    ])
  })

  it('does not merge notes of different kinds with the same text', () => {
    const notes: MarginNote[] = [
      prompt('p1', 'x'),
      { id: 's1', kind: 'summary', label: 'Prompt', html: '<q>x</q>' },
    ]
    const blocks = [block('a', ['p1']), block('b', ['s1'])]
    expect(mergeRepeatedNotes(blocks, notes).map((b) => b.noteIds)).toEqual([['p1'], ['s1']])
  })
})

describe('buildRows', () => {
  it('starts a new row at the next section even when a prompt spans both (x273)', () => {
    const summary = (id: string): MarginNote => ({ id, kind: 'summary', html: `<p>${id}</p>` })
    const notes = [summary('s4'), summary('s9'), prompt('p0', 'The whole-session prompt')]
    const rows = buildRows(
      [
        block('h4', ['s4']),
        block('b5', ['s4']),
        block('b6', ['s4', 'p0']),
        block('h9', ['s9', 'p0']),
        block('b10', ['s9']),
      ],
      notes,
    )
    expect(rows.map((r) => r.blocks.map((b) => b.id))).toEqual([
      ['h4', 'b5', 'b6'],
      ['h9', 'b10'],
    ])
    expect(rows[1].notes.map((n) => n.id)).toEqual(['s9'])
  })

  it('shows a prompt that produced several paragraphs once', () => {
    const notes = [prompt('p1', 'Write the intro'), prompt('p2', 'Write the intro')]
    const rows = buildRows([block('a', ['p1']), block('b', ['p2'])], notes)
    const shown = rows.flatMap((r) => r.notes.map((n) => n.id))
    expect(shown).toEqual(['p1'])
    expect(rows).toHaveLength(1)
    expect(rows[0].blocks.map((b) => b.id)).toEqual(['a', 'b'])
  })
})
