import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { buildRows, defaultShownKinds } from './rows.js'
import type { MarginNote, MarginNotesProps } from './types.js'

/** Layout effect in the browser, plain effect on the server (where it never runs). */
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Where a phone reader's "current section" is read: this fraction down the viewport. */
const READING_LINE = 0.35

/**
 * Long-form text with notes beside each paragraph.
 *
 * Desktop: a prose column and, to its right, a narrower notes column; each
 * note lines up with the block(s) it belongs to and appears once. Phone: the
 * notes column disappears and a bar fixed to the bottom shows the notes for
 * the section being read (tap a block to pin its notes, tap again to let go),
 * with the kind switches in the bar. Every default — which kinds show, which
 * surface a width gets — is decided in the first render and by CSS, so
 * server-rendered or prerendered HTML is right before any JavaScript runs.
 *
 * @param props - See {@link MarginNotesProps}.
 * @returns The layout.
 */
export function MarginNotes(props: MarginNotesProps): JSX.Element {
  const {
    blocks,
    notes = [],
    kinds = [],
    markLabel,
    measure = '38rem',
    gutterWidth = '18rem',
    shownKinds: shownKindsProp,
    onShownKindsChange,
    className,
    style,
    ...rest
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const rows = useMemo(() => buildRows(blocks, notes), [blocks, notes])
  const notesById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])
  const hasNotes = rows.some((r) => r.notes.length > 0)

  // Which kinds show. From props in the FIRST render (never an effect), so the
  // prerendered page already has the reader's defaults.
  const [ownShown, setOwnShown] = useState<string[]>(() => defaultShownKinds(kinds))
  const shown = shownKindsProp ?? ownShown
  const switchable = useMemo(() => new Set(kinds.map((k) => k.id)), [kinds])
  const isShown = useCallback(
    (note: MarginNote) => !switchable.has(note.kind) || shown.includes(note.kind),
    [shown, switchable],
  )
  const setShown = (kind: string, on: boolean): void => {
    const next = on ? [...new Set([...shown, kind])] : shown.filter((k) => k !== kind)
    if (shownKindsProp === undefined) setOwnShown(next)
    onShownKindsChange?.(next)
  }

  // The two-way relationship: a hovered/focused block emphasises its notes; a
  // hovered/focused note tints the blocks it covers.
  const [activeBlock, setActiveBlock] = useState<string | null>(null)
  const [activeNote, setActiveNote] = useState<string | null>(null)
  const activeBlockNotes = useMemo(() => {
    const b = activeBlock ? blocks.find((x) => x.id === activeBlock) : undefined
    return new Set(b?.noteIds ?? [])
  }, [activeBlock, blocks])

  // Phone: the section being read, and a block the reader tapped.
  const firstWithNotes = rows.find((r) => r.noteIds.length > 0)?.id ?? null
  const [readingRow, setReadingRow] = useState<string | null>(firstWithNotes)
  const [pinnedBlock, setPinnedBlock] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!hasNotes || typeof window === 'undefined') return
    let frame = 0
    const read = (): void => {
      frame = 0
      const line = window.innerHeight * READING_LINE
      let current: string | null = null
      for (const row of rows) {
        const el = rowRefs.current.get(row.id)
        if (!el) continue
        if (el.getBoundingClientRect().top > line) break
        if (row.noteIds.length > 0) current = row.id
      }
      setReadingRow(current ?? firstWithNotes)
    }
    const onScroll = (): void => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [hasNotes, rows, firstWithNotes])

  // A row that opens on a heading (or any block with a top margin) starts its
  // text below the row's top; push the notes down by the same distance so a
  // note lines up with the first line it covers, not the margin above it.
  const [noteOffsets, setNoteOffsets] = useState<Record<string, number>>({})
  useBrowserLayoutEffect(() => {
    if (!hasNotes) return
    const measureOffsets = (): void => {
      const next: Record<string, number> = {}
      for (const row of rows) {
        if (row.notes.length === 0) continue
        const rowEl = rowRefs.current.get(row.id)
        const blockEl = document.getElementById(row.blocks[0].id)
        const first = blockEl?.firstElementChild ?? blockEl
        if (!rowEl || !first) continue
        const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
        const offset = Math.max(0, Math.round(top))
        if (offset) next[row.id] = offset
      }
      setNoteOffsets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    measureOffsets()
    window.addEventListener('resize', measureOffsets)
    return () => window.removeEventListener('resize', measureOffsets)
  }, [hasNotes, rows])

  // Kinds that reach the panel only on a tap (notes about one paragraph).
  const tapOnly = useMemo(
    () => new Set(kinds.filter((k) => k.panel === 'tap').map((k) => k.id)),
    [kinds],
  )
  const panelNoteIds = useMemo(() => {
    if (pinnedBlock) return blocks.find((b) => b.id === pinnedBlock)?.noteIds ?? []
    const ids = rows.find((r) => r.id === readingRow)?.noteIds ?? []
    return ids.filter((id) => !tapOnly.has(notesById.get(id)?.kind ?? ''))
  }, [pinnedBlock, readingRow, blocks, rows, tapOnly, notesById])
  const panelNotes = panelNoteIds
    .map((id) => notesById.get(id))
    .filter((n): n is MarginNote => !!n && isShown(n))

  const switches = (placement: 'side' | 'bar'): JSX.Element | null =>
    kinds.length === 0 ? null : (
      <div
        role="group"
        aria-label={t('marginNotes.aria.toggles', undefined, {
          defaultValue: 'Show or hide notes',
        })}
        className={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', align: 'center' })}
        data-mol-id={`margin-notes-switches-${placement}`}
      >
        {kinds.map((kind) => (
          <Switch
            key={kind.id}
            label={kind.label}
            checked={shown.includes(kind.id)}
            onChange={(event) => setShown(kind.id, (event.target as HTMLInputElement).checked)}
            className={placement === 'bar' ? cm.touchTarget : cm.touchTargetCompact}
            data-mol-id={`margin-notes-switch-${placement}-${kind.id}`}
          />
        ))}
      </div>
    )

  const noteView = (note: MarginNote, where: 'gutter' | 'panel'): JSX.Element => {
    const emphasised = activeBlockNotes.has(note.id) || activeNote === note.id
    return (
      <aside
        key={note.id}
        hidden={!isShown(note)}
        tabIndex={where === 'gutter' ? 0 : -1}
        data-note-kind={note.kind}
        data-note-emphasis={emphasised ? 'true' : undefined}
        data-mol-id={`margin-note-${where}-${note.id}`}
        onMouseEnter={where === 'gutter' ? () => setActiveNote(note.id) : undefined}
        onMouseLeave={where === 'gutter' ? () => setActiveNote(null) : undefined}
        onFocus={where === 'gutter' ? () => setActiveNote(note.id) : undefined}
        onBlur={where === 'gutter' ? () => setActiveNote(null) : undefined}
        className={cm.cn(
          cm.sp('p', 3),
          cm.textSize('sm'),
          cm.textMuted,
          emphasised && cm.bgPrimarySubtle,
          emphasised && cm.shadowLifted,
        )}
      >
        {note.content}
      </aside>
    )
  }

  const containerStyle: CSSProperties = {
    ...style,
    maxWidth: hasNotes ? `calc(${measure} + ${gutterWidth} + 4rem)` : measure,
  }

  return (
    <div
      {...rest}
      className={cm.cn(cm.mxAuto, cm.w('full'), className)}
      style={containerStyle}
      data-mol-id="margin-notes"
    >
      {hasNotes && kinds.length > 0 && (
        <div className={cm.cn(cm.hiddenBelow('md'), cm.sp('mb', 6))}>{switches('side')}</div>
      )}
      <div className={cm.cn(cm.textSize('xl'), cm.stack(0))}>
        {rows.map((row) => (
          <div
            key={row.id}
            ref={(el) => {
              if (el) rowRefs.current.set(row.id, el)
              else rowRefs.current.delete(row.id)
            }}
            className={cm.flex({ direction: 'row', align: 'start', gap: 'xl' })}
            data-mol-id={`margin-notes-row-${row.id}`}
          >
            <div className={cm.flex1} style={{ maxWidth: measure, minWidth: 0 }}>
              {row.blocks.map((block) => {
                const ids = block.noteIds ?? []
                const tinted = !!activeNote && ids.includes(activeNote)
                const interactive = ids.length > 0
                return (
                  <div
                    key={block.id}
                    id={block.id}
                    tabIndex={interactive ? 0 : undefined}
                    data-mol-id={`margin-notes-block-${block.id}`}
                    data-block-marked={block.marked ? 'true' : undefined}
                    data-block-pinned={pinnedBlock === block.id ? 'true' : undefined}
                    onMouseEnter={interactive ? () => setActiveBlock(block.id) : undefined}
                    onMouseLeave={interactive ? () => setActiveBlock(null) : undefined}
                    onFocus={interactive ? () => setActiveBlock(block.id) : undefined}
                    onBlur={interactive ? () => setActiveBlock(null) : undefined}
                    onClick={
                      interactive
                        ? () => setPinnedBlock((p) => (p === block.id ? null : block.id))
                        : undefined
                    }
                    className={cm.cn(cm.position('relative'), tinted && cm.bgPrimarySubtle)}
                  >
                    {block.marked && (
                      <span
                        role="img"
                        aria-label={markLabel}
                        data-mol-id={`margin-notes-mark-${block.id}`}
                        className={cm.cn(
                          cm.position('absolute'),
                          cm.roundedFull,
                          cm.bgPrimary,
                          cm.hiddenBelow('md'),
                        )}
                        style={{ left: '-0.9rem', top: '0.75em', width: '6px', height: '6px' }}
                      />
                    )}
                    {block.content}
                  </div>
                )
              })}
            </div>
            {hasNotes && (
              <div
                className={cm.cn(cm.hiddenBelow('md'), cm.stack(3))}
                style={{ width: gutterWidth, flexShrink: 0, paddingTop: noteOffsets[row.id] }}
                aria-label={t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' })}
                role="complementary"
              >
                {row.notes.map((note) => noteView(note, 'gutter'))}
              </div>
            )}
          </div>
        ))}
      </div>
      {hasNotes && (
        <>
          {/* Room for the phone bar, so it never covers the last paragraph. */}
          <div className={cm.hiddenFrom('md')} style={{ height: '14rem' }} aria-hidden="true" />
          <div
            className={cm.cn(
              cm.hiddenFrom('md'),
              cm.position('fixed'),
              cm.surface,
              cm.borderT,
              cm.shadowLifted,
              cm.sp('p', 3),
              cm.stack(2),
            )}
            style={{ left: 0, right: 0, bottom: 0, zIndex: 20 }}
            data-mol-id="margin-notes-bar"
          >
            <div
              role="region"
              aria-live="polite"
              aria-label={t('marginNotes.aria.panel', undefined, {
                defaultValue: 'Notes for this section',
              })}
              style={{ maxHeight: '40vh', overflowY: 'auto' }}
              data-mol-id="margin-notes-panel"
            >
              {panelNotes.map((note) => noteView(note, 'panel'))}
              {pinnedBlock && (
                <button
                  type="button"
                  onClick={() => setPinnedBlock(null)}
                  className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTarget)}
                  data-mol-id="margin-notes-dismiss"
                >
                  {t('marginNotes.dismiss', undefined, { defaultValue: 'Dismiss' })}
                </button>
              )}
            </div>
            {switches('bar')}
          </div>
        </>
      )}
    </div>
  )
}
