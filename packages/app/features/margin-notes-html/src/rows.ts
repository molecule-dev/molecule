import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesRow } from './types.js'

/**
 * Group blocks into layout rows and place each note once.
 *
 * A row runs for as long as its blocks are covered by a note it OPENED with: a
 * section's summary (every block of the section refers to it) keeps the whole
 * section in one row, and a note that first appears mid-row — a prompt behind
 * one of the section's paragraphs — joins that row's gutter but does not
 * extend the row. (A prompt that produced paragraphs in several sections once
 * carried a row across the next heading, and that section's summary was drawn
 * beside the previous section.) A sticky note is
 * bounded by its row, so this is what keeps a summary pinned until its section
 * ends; splitting the row wherever the note set changed released it after the
 * first paragraph. A run of blocks with no notes is a row of its own. Each note
 * is shown once, in the first row that refers to it.
 *
 * Only a note about the whole section keeps a row going: a note of a `'tap'`
 * kind is about one paragraph, so it never carries a row past its block. Before
 * that, a prompt that wrote a post's opening AND the next section's first
 * paragraph opened the first row with the summary, and the next section's
 * summary was stacked under it, 180–200 px above its own heading (X0 x375,
 * x376, 2026-09-29).
 *
 * @param blocks - The text, in reading order.
 * @param notes - Every note the blocks refer to; ids with no note are ignored.
 * @param kinds - The note kinds; a `'tap'` kind never extends a row. Without
 *   them every note does.
 * @returns The rows, in reading order.
 */
export function buildRows(
  blocks: MarginNotesBlock[],
  notes: MarginNote[] = [],
  kinds: MarginNoteKind[] = [],
): MarginNotesRow[] {
  blocks = mergeRepeatedNotes(blocks, notes)
  const byId = new Map(notes.map((n) => [n.id, n]))
  const paragraphKinds = new Set(kinds.filter((k) => k.panel === 'tap').map((k) => k.id))
  const extendsRow = (id: string): boolean => !paragraphKinds.has(byId.get(id)!.kind)
  const known = (ids: string[] | undefined): string[] =>
    [...new Set(ids ?? [])].filter((id) => byId.has(id))
  const key = (ids: string[]): string => [...ids].sort().join('\u0000')
  const rows: MarginNotesRow[] = []
  const placed = new Set<string>()
  let current: MarginNotesRow | null = null
  let currentKey = ''
  let opening: string[] = []
  for (const block of blocks) {
    const ids = known(block.noteIds)
    const k = key(ids)
    const stillCovered =
      current !== null && ids.some((id) => opening.includes(id) && extendsRow(id))
    if (current && (k === currentKey || stillCovered)) {
      current.blocks.push(block)
      for (const id of ids) {
        if (!current.noteIds.includes(id)) current.noteIds.push(id)
        if (placed.has(id)) continue
        placed.add(id)
        current.notes.push(byId.get(id)!)
      }
      continue
    }
    current = { id: block.id, blocks: [block], notes: [], noteIds: [...ids] }
    currentKey = k
    opening = ids
    for (const id of ids) {
      if (placed.has(id)) continue
      placed.add(id)
      current.notes.push(byId.get(id)!)
    }
    rows.push(current)
  }
  return rows
}

/**
 * One note per act of writing: when consecutive blocks each carry their own
 * note with the same kind, label and HTML (one prompt that produced three
 * paragraphs, recorded as three notes), every later block is pointed at the
 * first block's note instead. {@link buildRows} places each note once, so the
 * prompt is shown once, beside the first paragraph it produced, and hovering
 * any of those paragraphs highlights that one note. The same text appearing
 * again after a block without it is a new act, and keeps its own note.
 *
 * @param blocks - The text, in reading order.
 * @param notes - Every note the blocks refer to.
 * @returns The blocks, with repeated notes pointed at the first copy.
 */
export function mergeRepeatedNotes(
  blocks: MarginNotesBlock[],
  notes: MarginNote[] = [],
): MarginNotesBlock[] {
  const byId = new Map(notes.map((n) => [n.id, n]))
  const content = (n: MarginNote): string => `${n.kind}\u0000${n.label ?? ''}\u0000${n.html.trim()}`
  // Content → id of the note the PREVIOUS block showed for it.
  let previous = new Map<string, string>()
  return blocks.map((block) => {
    const current = new Map<string, string>()
    let changed = false
    const noteIds = (block.noteIds ?? []).map((id) => {
      const note = byId.get(id)
      if (!note) return id
      const key = content(note)
      const first = previous.get(key)
      const use = first ?? id
      if (use !== id) changed = true
      if (!current.has(key)) current.set(key, use)
      return use
    })
    previous = current
    return changed ? { ...block, noteIds: [...new Set(noteIds)] } : block
  })
}

/**
 * The kinds shown before the reader touches a switch.
 *
 * @param kinds - The switchable kinds.
 * @returns The ids of the kinds that default on.
 */
export function defaultShownKinds(kinds: { id: string; defaultOn?: boolean }[] = []): string[] {
  return kinds.filter((k) => k.defaultOn !== false).map((k) => k.id)
}
