import type { JSX } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Switch } from '@molecule/app-ui-react'
import { Box, Pressable, ScrollArea } from '@molecule/app-ui-react/elements'

import { buildRows, defaultShownKinds } from './rows.js'
import type { MarginNote, MarginNoteKind, MarginNotesProps } from './types.js'
import { useReadingPosition } from './useReadingPosition.js'

const NO_NOTES: MarginNote[] = []
const NO_KINDS: MarginNoteKind[] = []

/**
 * Long-form text with notes beside each paragraph.
 *
 * Desktop: a prose column and, to its right, a narrower notes column; each
 * note lines up with the block(s) it belongs to and appears once. Phone: the
 * notes column disappears and a bar fixed to the bottom shows the notes for
 * the section being read (a noted block's pin button pins its notes, a second
 * press lets go),
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
    notes = NO_NOTES,
    kinds = NO_KINDS,
    markLabel,
    measure = '38rem',
    gutterWidth = '18rem',
    shownKinds: shownKindsProp,
    onShownKindsChange,
    className,
    style,
    webStyle,
    ...rest
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()
  const pinLabel = t('marginNotes.aria.pin', undefined, {
    defaultValue: 'Pin the notes for this section',
  })
  // A named mark is an image named by `markLabel`; an unnamed one is
  // decorative (axe-core rejects an image with no name).
  const markNamed = typeof markLabel === 'string' && markLabel.trim().length > 0

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

  // Phone: the section being read, and a block the reader pinned.
  const [pinnedBlock, setPinnedBlock] = useState<string | null>(null)
  const { rootRef, rowRefs, blockRefs, deviceHeight, readingRow, noteOffsets, onScroll } =
    useReadingPosition(rows, hasNotes)
  const device = deviceHeight !== undefined

  // Kinds that reach the panel only through a block's pin (notes about one paragraph).
  const tapOnly = useMemo(
    () => new Set(kinds.filter((k) => k.panel === 'tap').map((k) => k.id)),
    [kinds],
  )
  const panelNoteIds = useMemo(() => {
    if (pinnedBlock) return blocks.find((b) => b.id === pinnedBlock)?.noteIds ?? []
    const ids = rows.find((r) => r.id === readingRow)?.noteIds ?? []
    // A tap kind follows the reader too once its switch is ON: turning the
    // switch on must show something on a phone, not wait for a pin.
    return ids.filter((id) => {
      const note = notesById.get(id)
      return !!note && (!tapOnly.has(note.kind) || isShown(note))
    })
  }, [pinnedBlock, readingRow, blocks, rows, tapOnly, notesById, isShown])
  // A pinned block's tap-kind notes show whatever their switch says: on a phone
  // the pin is the only way to reach a note about one paragraph (a prompt that
  // defaults off). Follow-kind notes keep obeying their switch.
  const inPanel = (note: MarginNote): boolean =>
    isShown(note) || (pinnedBlock !== null && tapOnly.has(note.kind))
  const panelNotes = panelNoteIds
    .map((id) => notesById.get(id))
    .filter((n): n is MarginNote => !!n && inPanel(n))

  const switches = (placement: 'side' | 'bar'): JSX.Element | null =>
    kinds.length === 0 ? null : (
      <Box
        as="div"
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
            onChange={({ target }) => {
              if (target && 'checked' in target && typeof target.checked === 'boolean') {
                setShown(kind.id, target.checked)
              }
            }}
            className={placement === 'bar' ? cm.touchTarget : cm.touchTargetCompact}
            data-mol-id={`margin-notes-switch-${placement}-${kind.id}`}
          />
        ))}
      </Box>
    )

  const noteView = (note: MarginNote, where: 'gutter' | 'panel'): JSX.Element => {
    const emphasised = activeBlockNotes.has(note.id) || activeNote === note.id
    return (
      <Box
        as="aside"
        key={note.id}
        hidden={where === 'panel' ? !inPanel(note) : !isShown(note)}
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
      </Box>
    )
  }

  return (
    <Box
      {...rest}
      as="div"
      ref={rootRef}
      className={cm.cn(cm.mxAuto, cm.w('full'), className)}
      style={device ? { height: deviceHeight, flexShrink: 1, ...style } : style}
      webStyle={{
        ...webStyle,
        maxWidth: hasNotes ? `calc(${measure} + ${gutterWidth} + 4rem)` : measure,
      }}
      data-mol-id="margin-notes"
    >
      {hasNotes && kinds.length > 0 && (
        <Box as="div" className={cm.cn(cm.hiddenBelow('md'), cm.sp('mb', 6))}>
          {switches('side')}
        </Box>
      )}
      <ScrollArea
        as="div"
        onScroll={device ? onScroll : undefined}
        className={cm.cn(cm.textSize('xl'), cm.stack(0))}
        style={device ? { flexGrow: 1 } : undefined}
      >
        {rows.map((row) => (
          <Box
            as="div"
            key={row.id}
            ref={(el) => {
              if (el) rowRefs.current.set(row.id, el)
              else rowRefs.current.delete(row.id)
            }}
            className={cm.flex({ direction: 'row', align: 'start', gap: 'xl' })}
            data-mol-id={`margin-notes-row-${row.id}`}
          >
            <Box as="div" className={cm.flex1} webStyle={{ maxWidth: measure, minWidth: 0 }}>
              {row.blocks.map((block) => {
                const ids = block.noteIds ?? []
                const tinted = !!activeNote && ids.includes(activeNote)
                const interactive = ids.length > 0
                const togglePin = (): void =>
                  setPinnedBlock((p) => (p === block.id ? null : block.id))
                return (
                  // The block stays plain prose (its own links stay links); a
                  // noted block carries a pin toggle, shown where the phone bar
                  // is, with `aria-pressed` for the pinned state.
                  <Box
                    as="div"
                    key={block.id}
                    ref={(element) => {
                      if (element) blockRefs.current.set(block.id, element)
                      else blockRefs.current.delete(block.id)
                    }}
                    id={block.id}
                    data-mol-id={`margin-notes-block-${block.id}`}
                    data-block-marked={block.marked ? 'true' : undefined}
                    data-block-pinned={pinnedBlock === block.id ? 'true' : undefined}
                    onMouseEnter={interactive ? () => setActiveBlock(block.id) : undefined}
                    onMouseLeave={interactive ? () => setActiveBlock(null) : undefined}
                    onFocus={interactive ? () => setActiveBlock(block.id) : undefined}
                    onBlur={interactive ? () => setActiveBlock(null) : undefined}
                    className={cm.cn(cm.position('relative'), tinted && cm.bgPrimarySubtle)}
                  >
                    {block.marked && (
                      <Box
                        as="span"
                        role={markNamed ? 'img' : undefined}
                        aria-label={markNamed ? markLabel : undefined}
                        aria-hidden={markNamed ? undefined : 'true'}
                        data-mol-id={`margin-notes-mark-${block.id}`}
                        className={cm.cn(
                          cm.position('absolute'),
                          cm.roundedFull,
                          cm.bgPrimary,
                          cm.hiddenBelow('md'),
                        )}
                        style={device ? { top: 15 } : undefined}
                        webStyle={{ left: '-0.9rem', top: '0.75em', width: '6px', height: '6px' }}
                      />
                    )}
                    {block.content}
                    {interactive && (
                      <Box
                        as="div"
                        className={cm.cn(cm.hiddenFrom('md'), cm.flex({ justify: 'end' }))}
                      >
                        <Pressable
                          as="button"
                          type="button"
                          aria-pressed={pinnedBlock === block.id}
                          aria-label={pinLabel}
                          data-mol-id={`margin-notes-pin-${block.id}`}
                          onClick={togglePin}
                          className={cm.button({ variant: 'ghost', size: 'sm' })}
                        >
                          <Icon name="pin" size={16} aria-hidden="true" />
                        </Pressable>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
            {hasNotes && (
              <Box
                as="div"
                className={cm.cn(cm.hiddenBelow('md'), cm.stack(3))}
                webStyle={{
                  width: gutterWidth,
                  flexShrink: 0,
                  paddingTop: noteOffsets.get(row.id),
                }}
                aria-label={t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' })}
                role="complementary"
              >
                {row.notes.map((note) => noteView(note, 'gutter'))}
              </Box>
            )}
          </Box>
        ))}
      </ScrollArea>
      {hasNotes && (
        <>
          {/* On web the bar floats above the document. Device layout reserves its actual height. */}
          {!device && (
            <Box
              as="div"
              className={cm.hiddenFrom('md')}
              webStyle={{ height: '14rem' }}
              aria-hidden="true"
            />
          )}
          <Box
            as="div"
            className={cm.cn(
              cm.hiddenFrom('md'),
              cm.position('fixed'),
              cm.surface,
              cm.borderT,
              cm.shadowLifted,
              cm.sp('p', 3),
              cm.stack(2),
            )}
            style={
              device
                ? { position: 'relative', flexShrink: 0, zIndex: 20 }
                : { left: 0, right: 0, bottom: 0, zIndex: 20 }
            }
            data-mol-id="margin-notes-bar"
          >
            <ScrollArea
              as="div"
              role="region"
              aria-live="polite"
              aria-label={t('marginNotes.aria.panel', undefined, {
                defaultValue: 'Notes for this section',
              })}
              style={deviceHeight === undefined ? undefined : { maxHeight: deviceHeight * 0.4 }}
              webStyle={{ maxHeight: '40vh', overflowY: 'auto' }}
              data-mol-id="margin-notes-panel"
            >
              {panelNotes.map((note) => noteView(note, 'panel'))}
              {pinnedBlock && (
                <Pressable
                  as="button"
                  type="button"
                  onClick={() => setPinnedBlock(null)}
                  className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTarget)}
                  data-mol-id="margin-notes-dismiss"
                >
                  {t('marginNotes.dismiss', undefined, { defaultValue: 'Hide notes' })}
                </Pressable>
              )}
            </ScrollArea>
            {switches('bar')}
          </Box>
        </>
      )}
    </Box>
  )
}
