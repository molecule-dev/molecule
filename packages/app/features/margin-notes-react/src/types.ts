import type { HTMLAttributes, ReactNode } from 'react'

/**
 * One block of the text — usually a paragraph or heading from your markdown
 * renderer. Blocks render in order, in the prose column.
 */
export interface MarginNotesBlock {
  /** Stable id, unique within the document (used as the DOM anchor). */
  id: string
  /** The rendered block (e.g. `<p>…</p>`). */
  content: ReactNode
  /** Ids of the notes that belong to this block (see {@link MarginNote}). */
  noteIds?: string[]
  /**
   * Draw a small mark in this block's left margin — the one permanent sign on
   * the prose itself (e.g. "written with AI"). Unmarked blocks carry none.
   */
  marked?: boolean
}

/** A note shown beside the block(s) it belongs to. */
export interface MarginNote {
  /** Stable id, referenced from {@link MarginNotesBlock.noteIds}. */
  id: string
  /** The kind this note belongs to ({@link MarginNoteKind.id}), for its switch. */
  kind: string
  /** The rendered note. */
  content: ReactNode
}

/** A kind of note the reader can show or hide with a switch. */
export interface MarginNoteKind {
  /** Stable id, referenced from {@link MarginNote.kind}. */
  id: string
  /** The switch's visible label, already translated (e.g. "Summaries"). */
  label: string
  /** Whether this kind shows before the reader touches its switch. Default `true`. */
  defaultOn?: boolean
  /**
   * How this kind reaches the phone panel. `'follow'` (default): the panel
   * shows it for the section being read, following the reader. `'tap'`: only
   * when the reader taps a block it belongs to (and gone on the second tap) —
   * for notes about one paragraph rather than the section.
   */
  panel?: 'follow' | 'tap'
}

/** `<MarginNotes>` props. */
export interface MarginNotesProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The text, in reading order. */
  blocks: MarginNotesBlock[]
  /** Every note the blocks refer to. A document with none renders centred prose with no gutter. */
  notes?: MarginNote[]
  /** The note kinds, in the order their switches appear. Kinds absent here are always shown. */
  kinds?: MarginNoteKind[]
  /** Accessible name of the margin mark, already translated (e.g. "Written with AI"). */
  markLabel?: string
  /** Width of the prose column (a CSS length). Default `38rem`. */
  measure?: string
  /** Width of the notes column (a CSS length). Default `18rem`. */
  gutterWidth?: string
  /** Controlled: the ids of the kinds currently shown. Omit to let the component own it. */
  shownKinds?: string[]
  /** Called with the new list of shown kind ids whenever the reader flips a switch. */
  onShownKindsChange?: (shown: string[]) => void
}

/** One row of the layout: a run of blocks and the notes shown beside it. */
export interface MarginNotesRow {
  /** The row's key: the id of its first block. */
  id: string
  /** The blocks in this row, in order. */
  blocks: MarginNotesBlock[]
  /** Notes shown beside this row — each note appears in exactly one row, its first. */
  notes: MarginNote[]
  /** Every note id any block in this row refers to (for the phone panel). */
  noteIds: string[]
}
