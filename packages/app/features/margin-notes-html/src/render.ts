import { t } from '@molecule/app-i18n'

import { buildRows, defaultShownKinds } from './rows.js'
import type {
  MarginNote,
  MarginNoteKind,
  MarginNotesRow,
  RenderedMarginNotes,
  RenderMarginNotesOptions,
} from './types.js'

/**
 * Escapes text for use in HTML text and attribute values.
 *
 * @param s - Plain text.
 * @returns The escaped text.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * The accent colour of a kind: its own `accent`, else `--mn-accent-<n>` by position.
 *
 * @param kinds - The switchable kinds.
 * @param kindId - The note's kind.
 * @returns A CSS colour value.
 */
function accentOf(kinds: MarginNoteKind[], kindId: string): string {
  const i = kinds.findIndex((k) => k.id === kindId)
  const kind = kinds[i]
  if (kind?.accent) return kind.accent
  return `var(--mn-accent-${i >= 0 ? i + 1 : 1})`
}

/**
 * Renders the switches for a layout's kinds.
 *
 * @param kinds - The kinds, in switch order.
 * @param shown - The kinds shown at first.
 * @param rootId - The layout's id.
 * @param placement - `'side'` (desktop, placed by the page) or `'bar'` (the phone bar).
 * @returns The switch group's HTML, or `''` without kinds.
 */
function renderSwitches(
  kinds: MarginNoteKind[],
  shown: string[],
  rootId: string,
  placement: 'side' | 'bar',
): string {
  if (kinds.length === 0) return ''
  const label = escapeHtml(
    t('marginNotes.aria.toggles', undefined, { defaultValue: 'Show or hide notes' }),
  )
  const items = kinds
    .map((kind) => {
      const on = shown.includes(kind.id)
      const k = escapeHtml(kind.id)
      return (
        `<button type="button" role="switch" aria-checked="${on}" data-mn-switch data-mn-kind="${k}"` +
        ` data-mn-for="${escapeHtml(rootId)}" data-mol-id="margin-notes-switch-${placement}-${k}"` +
        ` style="--mn-note-accent: ${escapeHtml(accentOf(kinds, kind.id))}">` +
        `<span data-mn-track aria-hidden="true"><span data-mn-knob></span></span>` +
        `<span data-mn-switch-label>${escapeHtml(kind.label)}</span></button>`
      )
    })
    .join('')
  return (
    `<div role="group" aria-label="${label}" data-mn-switches="${placement}"` +
    ` data-mn-for="${escapeHtml(rootId)}" data-mol-id="margin-notes-switches-${placement}">${items}</div>`
  )
}

/**
 * Renders one note.
 *
 * @param note - The note.
 * @param kinds - The switchable kinds (for its accent).
 * @param where - The gutter (desktop) or the phone panel.
 * @param hidden - Whether it starts hidden.
 * @returns The note's HTML.
 */
function renderNote(
  note: MarginNote,
  kinds: MarginNoteKind[],
  where: 'gutter' | 'panel',
  hidden: boolean,
): string {
  const label = note.label ? `<p data-mn-note-label>${escapeHtml(note.label)}</p>` : ''
  return (
    `<aside data-mn-note="${escapeHtml(note.id)}" data-mn-kind="${escapeHtml(note.kind)}" data-mn-where="${where}"` +
    `${where === 'gutter' ? ' tabindex="0"' : ''}${hidden ? ' hidden' : ''}` +
    ` data-mol-id="margin-note-${where}-${escapeHtml(note.id)}"` +
    ` style="--mn-note-accent: ${escapeHtml(accentOf(kinds, note.kind))}">` +
    `${label}<div data-mn-note-body>${note.html}</div></aside>`
  )
}

/**
 * Renders a long-form text with notes beside each paragraph, as HTML.
 *
 * Desktop: the prose column and, beside it, a narrower notes column; each
 * note lines up with the block(s) it belongs to, appears once, and stays in
 * view while its section scrolls past. Phone: the notes column disappears and
 * a bar fixed to the bottom carries the switches and a panel with the notes
 * for the section being read. Every default — which kinds show, which surface
 * a width gets — is in the HTML and the CSS, so the page is right before any
 * script runs; {@link marginNotesScript} adds the switches, hover, and the
 * phone panel's following.
 *
 * @param options - See {@link RenderMarginNotesOptions}.
 * @returns The layout, the desktop switches to place, and whether it has notes.
 */
export function renderMarginNotes(options: RenderMarginNotesOptions): RenderedMarginNotes {
  const { blocks, notes = [], kinds = [], markLabel, id = 'margin-notes' } = options
  const rows = buildRows(blocks, notes)
  const hasNotes = rows.some((r) => r.notes.length > 0)
  const shown = defaultShownKinds(kinds)
  const switchable = new Set(kinds.map((k) => k.id))
  const isShown = (note: MarginNote): boolean =>
    !switchable.has(note.kind) || shown.includes(note.kind)
  const tapOnly = new Set(kinds.filter((k) => k.panel === 'tap').map((k) => k.id))
  const rootId = escapeHtml(id)

  const renderRow = (row: MarginNotesRow): string => {
    const blocksHtml = row.blocks
      .map((block) => {
        const ids = (block.noteIds ?? []).filter((nid) => notes.some((n) => n.id === nid))
        const interactive = ids.length > 0
        const mark = block.marked
          ? `<span data-mn-mark role="img"${markLabel ? ` aria-label="${escapeHtml(markLabel)}"` : ''}` +
            ` data-mol-id="margin-notes-mark-${escapeHtml(block.id)}"></span>`
          : ''
        return (
          `<div data-mn-block id="${escapeHtml(block.id)}"` +
          `${interactive ? ` data-mn-notes="${escapeHtml(ids.join(' '))}" tabindex="0"` : ''}` +
          `${block.marked ? ' data-mn-marked' : ''} data-mol-id="margin-notes-block-${escapeHtml(block.id)}">` +
          `${mark}${block.html}</div>`
        )
      })
      .join('')
    const gutter = hasNotes
      ? `<div data-mn-gutter role="complementary" aria-label="${escapeHtml(
          t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' }),
        )}"><div data-mn-sticky>${row.notes
          .map((n) => renderNote(n, kinds, 'gutter', !isShown(n)))
          .join('')}</div></div>`
      : ''
    return (
      `<div data-mn-row="${escapeHtml(row.id)}" data-mn-row-notes="${escapeHtml(row.noteIds.join(' '))}"` +
      ` data-mol-id="margin-notes-row-${escapeHtml(row.id)}"><div data-mn-prose>${blocksHtml}</div>${gutter}</div>`
    )
  }

  let bar = ''
  if (hasNotes) {
    // Before any script: the panel shows the first row's section notes, per the switches.
    const first = rows[0]
    const initial = new Set(
      (first?.noteIds ?? []).filter((nid) => {
        const n = notes.find((x) => x.id === nid)
        return !!n && !tapOnly.has(n.kind) && isShown(n)
      }),
    )
    const panelNotes = notes.map((n) => renderNote(n, kinds, 'panel', !initial.has(n.id))).join('')
    const dismiss = escapeHtml(t('marginNotes.dismiss', undefined, { defaultValue: 'Hide notes' }))
    bar =
      `<div data-mn-spacer aria-hidden="true"></div>` +
      `<div data-mn-bar data-mol-id="margin-notes-bar">` +
      `<div data-mn-panel role="region" aria-live="polite" aria-label="${escapeHtml(
        t('marginNotes.aria.panel', undefined, { defaultValue: 'Notes for this section' }),
      )}"${initial.size > 0 ? ' data-mn-open' : ''} data-mol-id="margin-notes-panel">` +
      `${panelNotes}<button type="button" data-mn-dismiss hidden data-mol-id="margin-notes-dismiss">${dismiss}</button></div>` +
      `${renderSwitches(kinds, shown, id, 'bar')}</div>`
  }

  const html =
    `<div data-mn-root id="${rootId}"${hasNotes ? ' data-mn-has-notes' : ''}` +
    ` data-mn-kinds="${escapeHtml(kinds.map((k) => k.id).join(' '))}"` +
    ` data-mn-tap-kinds="${escapeHtml([...tapOnly].join(' '))}" data-mol-id="margin-notes">` +
    `<div data-mn-rows>${rows.map(renderRow).join('')}</div>${bar}</div>`

  return {
    html,
    switchesHtml: hasNotes ? renderSwitches(kinds, shown, id, 'side') : '',
    hasNotes,
  }
}
