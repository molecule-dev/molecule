import type { MarginNote, MarginNotesBlock, MarginNotesRow } from './types.js'

/**
 * Group blocks into layout rows and place each note once.
 *
 * A row runs for as long as its blocks are covered by a note it holds: a
 * section's summary (every block of the section refers to it) keeps the whole
 * section in one row, and a note that first appears mid-row — a prompt behind
 * one of the section's paragraphs — joins that row's gutter. A sticky note is
 * bounded by its row, so this is what keeps a summary pinned until its section
 * ends; splitting the row wherever the note set changed released it after the
 * first paragraph. A run of blocks with no notes is a row of its own. Each note
 * is shown once, in the first row that refers to it.
 *
 * @param blocks - The text, in reading order.
 * @param notes - Every note the blocks refer to; ids with no note are ignored.
 * @returns The rows, in reading order.
 */
export function buildRows(blocks: MarginNotesBlock[], notes: MarginNote[] = []): MarginNotesRow[] {
  const byId = new Map(notes.map((n) => [n.id, n]))
  const known = (ids: string[] | undefined): string[] =>
    [...new Set(ids ?? [])].filter((id) => byId.has(id))
  const key = (ids: string[]): string => [...ids].sort().join('\u0000')
  const rows: MarginNotesRow[] = []
  const placed = new Set<string>()
  let current: MarginNotesRow | null = null
  let currentKey = ''
  for (const block of blocks) {
    const ids = known(block.noteIds)
    const k = key(ids)
    const stillCovered = current !== null && ids.some((id) => current!.noteIds.includes(id))
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
    current = { id: block.id, blocks: [block], notes: [], noteIds: ids }
    currentKey = k
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
 * The kinds shown before the reader touches a switch.
 *
 * @param kinds - The switchable kinds.
 * @returns The ids of the kinds that default on.
 */
export function defaultShownKinds(kinds: { id: string; defaultOn?: boolean }[] = []): string[] {
  return kinds.filter((k) => k.defaultOn !== false).map((k) => k.id)
}
