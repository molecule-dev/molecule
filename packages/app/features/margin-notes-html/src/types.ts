/**
 * One block of the text — usually a paragraph or heading from your markdown
 * renderer. Blocks render in order, in the prose column.
 */
export interface MarginNotesBlock {
  /** Stable id, unique within the page (used as the DOM anchor). */
  id: string
  /** The block's HTML (e.g. `<p>…</p>`). Trusted: it is inserted as is. */
  html: string
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
  /**
   * A small label above the note, already translated (e.g. "TL;DR" or
   * "Prompt · claude-fable-5"). Plain text; escaped.
   */
  label?: string
  /** The note's HTML. Trusted: it is inserted as is. */
  html: string
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
   * when the reader taps a block it belongs to (gone on the second tap) —
   * for notes about one paragraph rather than the section. A tap shows the
   * note even while its switch is off: on a phone the tap is how it is found.
   */
  panel?: 'follow' | 'tap'
  /**
   * The kind's accent colour (any CSS colour). Notes of different kinds are
   * told apart by colour alone: same font, same size. Defaults to
   * `var(--mn-accent-1)`, `var(--mn-accent-2)`, … by position.
   */
  accent?: string
}

/** Options for {@link renderMarginNotes}. */
export interface RenderMarginNotesOptions {
  /** The text, in reading order. */
  blocks: MarginNotesBlock[]
  /** Every note the blocks refer to. A page with none renders centred prose: no gutter, no bar, no switches. */
  notes?: MarginNote[]
  /** The note kinds, in the order their switches appear. Kinds absent here are always shown. */
  kinds?: MarginNoteKind[]
  /** Accessible name of the margin mark, already translated (e.g. "Written with AI"). */
  markLabel?: string
  /**
   * Id of this layout. Switches rendered elsewhere on the page (e.g. under the
   * title) find their layout by it. Default `'margin-notes'`.
   */
  id?: string
}

/** What {@link renderMarginNotes} returns. */
export interface RenderedMarginNotes {
  /** The layout: prose, gutter, and the phone bar (with its own switches). */
  html: string
  /**
   * The desktop switches, for you to place (e.g. centred under the title).
   * `''` when there is nothing to switch. Hidden at phone width, where the
   * bar's switches replace them.
   */
  switchesHtml: string
  /** Whether any block has a note (when `false`, `html` is plain centred prose). */
  hasNotes: boolean
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
