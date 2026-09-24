import type { MarginNote, MarginNotesBlock, MarginNotesRow } from './types.js'

/**
 * Group blocks into layout rows and place each note once.
 *
 * A row is a run of consecutive blocks that refer to exactly the same set of
 * notes (a paragraph run sharing one note), or a run of consecutive blocks
 * with no notes. Each note is shown beside the FIRST row that refers to it and
 * never again, so a note covering several paragraphs — even ones that are not
 * next to each other — appears once on the page.
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
    if (current && k === currentKey) {
      current.blocks.push(block)
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
