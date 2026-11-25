/**
 * Solid margin-notes reading layout — the counterpart of
 * `@molecule/app-margin-notes-react`'s `MarginNotes`, with the same props
 * (React names), the same ClassMap tokens, the same i18n keys and the same DOM
 * for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import { reactStyleText } from '@molecule/app-inline-style-dom'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Switch, webHover } from '@molecule/app-ui-solid'

import { buildRows, defaultShownKinds } from './rows.js'
import type { MarginNote, MarginNoteKind, MarginNotesProps } from './types.js'

/** Where a phone reader's "current section" is read: this fraction down the viewport. */
const READING_LINE = 0.35

/** Where a note is shown: the desktop notes column, or the phone bar's panel. */
type NotePlacement = 'gutter' | 'panel'

/** Where a switch group is shown: above the text, or in the phone bar. */
type SwitchPlacement = 'side' | 'bar'

/**
 * A node value as Solid renders it: JSX content, or a function returning it.
 *
 * @param value - The node value.
 * @returns The JSX content.
 */
const rendered = (value: JSX.Element | (() => JSX.Element)): JSX.Element =>
  typeof value === 'function' ? value() : value

/**
 * Long-form text with notes beside each paragraph.
 *
 * Desktop: a prose column and, to its right, a narrower notes column; each
 * note lines up with the block(s) it belongs to and appears once. Phone: the
 * notes column disappears and a bar fixed to the bottom shows the notes for
 * the section being read (a noted block's pin button pins its notes, a second
 * press lets go), with the kind switches in the bar. Every default — which
 * kinds show, which surface a width gets — is decided in the first render and
 * by CSS, so server-rendered or prerendered HTML is right before any JavaScript
 * runs.
 *
 * This is the Solid counterpart of `@molecule/app-margin-notes-react`.
 *
 * @param props - See {@link MarginNotesProps}.
 * @returns The rendered layout.
 */
export const MarginNotes: Component<MarginNotesProps> = (props) => {
  const [, rest] = splitProps(props, [
    'blocks',
    'notes',
    'kinds',
    'markLabel',
    'measure',
    'gutterWidth',
    'shownKinds',
    'onShownKindsChange',
    'className',
    'style',
    'webStyle',
  ])
  const cm = getClassMap()
  const { t } = useTranslation()
  const pinLabel = (): string =>
    t('marginNotes.aria.pin', undefined, { defaultValue: 'Pin the notes for this section' })
  // A named mark is an image named by `markLabel`; an unnamed one is
  // decorative (axe-core rejects an image with no name).
  const markNamed = (): boolean =>
    typeof props.markLabel === 'string' && props.markLabel.trim().length > 0

  const notes = (): MarginNote[] => props.notes ?? []
  const kinds = (): MarginNoteKind[] => props.kinds ?? []

  const rows = createMemo(() => buildRows(props.blocks, notes()))
  const notesById = createMemo(() => new Map(notes().map((n) => [n.id, n])))
  const hasNotes = createMemo(() => rows().some((r) => r.notes.length > 0))

  // Which kinds show. From props in the FIRST render (never an effect), so the
  // prerendered page already has the reader's defaults.
  const [ownShown, setOwnShown] = createSignal<string[]>(defaultShownKinds(kinds()))
  const shown = (): string[] => props.shownKinds ?? ownShown()
  const switchable = createMemo(() => new Set(kinds().map((k) => k.id)))
  const isShown = (note: MarginNote): boolean =>
    !switchable().has(note.kind) || shown().includes(note.kind)
  const setShown = (kind: string, on: boolean): void => {
    const next = on ? [...new Set([...shown(), kind])] : shown().filter((k) => k !== kind)
    if (props.shownKinds === undefined) setOwnShown(next)
    props.onShownKindsChange?.(next)
  }

  // The two-way relationship: a hovered/focused block emphasises its notes; a
  // hovered/focused note tints the blocks it covers.
  const [activeBlock, setActiveBlock] = createSignal<string | null>(null)
  const [activeNote, setActiveNote] = createSignal<string | null>(null)
  const activeBlockNotes = createMemo(() => {
    const id = activeBlock()
    const b = id ? props.blocks.find((x) => x.id === id) : undefined
    return new Set(b?.noteIds ?? [])
  })

  // Phone: the section being read, and a block the reader pinned.
  const firstWithNotes = createMemo(() => rows().find((r) => r.noteIds.length > 0)?.id ?? null)
  const [readingRow, setReadingRow] = createSignal<string | null>(firstWithNotes())
  const [pinnedBlock, setPinnedBlock] = createSignal<string | null>(null)
  const rowRefs = new Map<string, HTMLElement>()
  // Each block registers the element this component rendered for it: two
  // documents on a page can repeat block ids, and a lookup by id in the whole
  // document answers with the first one's.
  const blockRefs = new Map<string, HTMLElement>()

  /** Reads the section being read: the last noted row whose top is at or above the reading line. */
  const readRow = (): void => {
    if (!hasNotes()) return
    const line = window.innerHeight * READING_LINE
    let current: string | null = null
    for (const row of rows()) {
      const el = rowRefs.get(row.id)
      if (!el) continue
      if (el.getBoundingClientRect().top > line) break
      if (row.noteIds.length > 0) current = row.id
    }
    setReadingRow(current ?? firstWithNotes())
  }

  // A row that opens on a heading (or any block with a top margin) starts its
  // text below the row's top; push the notes down by the same distance so a
  // note lines up with the first line it covers, not the margin above it.
  const [noteOffsets, setNoteOffsets] = createSignal<Record<string, number>>({})
  const alignGutter = (): void => {
    const next: Record<string, number> = {}
    for (const row of rows()) {
      if (row.notes.length === 0) continue
      const rowEl = rowRefs.get(row.id)
      const blockEl = blockRefs.get(row.blocks[0].id)
      const first = blockEl?.firstElementChild ?? blockEl
      if (!rowEl || !first) continue
      const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
      const offset = Math.max(0, Math.round(top))
      if (offset) next[row.id] = offset
    }
    if (JSON.stringify(noteOffsets()) !== JSON.stringify(next)) setNoteOffsets(next)
  }

  /**
   * Installs the reading-position observer and reads once, exactly as React's
   * `useReadingPosition` does: every scroll in the document is read once per
   * animation frame (a nested scroller's included, so the bar follows the
   * reader inside one), and the frame that follows a resize also realigns the
   * notes, since the viewport's size is what a note was aligned to.
   *
   * @returns What undoes this installation.
   */
  const installObserver = (): (() => void) => {
    if (typeof window === 'undefined') return () => {}
    let frame = 0
    let resized = true
    const read = (): void => {
      frame = 0
      if (resized) {
        resized = false
        if (hasNotes()) alignGutter()
      }
      readRow()
    }
    const schedule = (): void => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }
    const onResize = (): void => {
      resized = true
      schedule()
    }
    read()
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', onResize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }
  // React's effect depends on `hasNotes`, `rows` and `firstWithNotes`: a new
  // document tears the listeners down and installs a fresh measurement.
  createEffect(on([hasNotes, rows, firstWithNotes], () => onCleanup(installObserver())))

  // Kinds that reach the panel only through a block's pin (notes about one paragraph).
  const tapOnly = createMemo(
    () =>
      new Set(
        kinds()
          .filter((k) => k.panel === 'tap')
          .map((k) => k.id),
      ),
  )
  const panelNoteIds = createMemo(() => {
    const pinned = pinnedBlock()
    if (pinned) return props.blocks.find((b) => b.id === pinned)?.noteIds ?? []
    const ids = rows().find((r) => r.id === readingRow())?.noteIds ?? []
    // A tap kind follows the reader too once its switch is ON: turning the
    // switch on must show something on a phone, not wait for a pin.
    return ids.filter((id) => {
      const note = notesById().get(id)
      return !!note && (!tapOnly().has(note.kind) || isShown(note))
    })
  })
  // A pinned block's tap-kind notes show whatever their switch says: on a phone
  // the pin is the only way to reach a note about one paragraph (a prompt that
  // defaults off). Follow-kind notes keep obeying their switch.
  const inPanel = (note: MarginNote): boolean =>
    isShown(note) || (pinnedBlock() !== null && tapOnly().has(note.kind))
  const panelNotes = createMemo(() =>
    panelNoteIds()
      .map((id) => notesById().get(id))
      .filter((n): n is MarginNote => !!n && inPanel(n)),
  )

  /**
   * The kind switches, in the panel above the text or in the phone bar.
   *
   * @param placement - Where the group is rendered.
   * @returns The group, or nothing when the document has no kinds.
   */
  const switches = (placement: SwitchPlacement): JSX.Element => (
    <Show when={kinds().length > 0}>
      <div
        role="group"
        aria-label={t('marginNotes.aria.toggles', undefined, {
          defaultValue: 'Show or hide notes',
        })}
        class={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', align: 'center' })}
        data-mol-id={`margin-notes-switches-${placement}`}
      >
        <For each={kinds()}>
          {(kind) => (
            <Switch
              label={kind.label}
              checked={shown().includes(kind.id)}
              onChange={({ target }) => {
                if (target && 'checked' in target && typeof target.checked === 'boolean') {
                  setShown(kind.id, target.checked)
                }
              }}
              className={placement === 'bar' ? cm.touchTarget : cm.touchTargetCompact}
              data-mol-id={`margin-notes-switch-${placement}-${kind.id}`}
            />
          )}
        </For>
      </div>
    </Show>
  )

  /**
   * One note, in the notes column or the phone panel.
   *
   * @param note - The note.
   * @param where - Which surface renders it.
   * @returns The note element.
   */
  const noteView = (note: MarginNote, where: NotePlacement): JSX.Element => {
    const emphasised = (): boolean => activeBlockNotes().has(note.id) || activeNote() === note.id
    const onEnter = (): void => {
      setActiveNote(note.id)
    }
    const onLeave = (): void => {
      setActiveNote(null)
    }
    return (
      <aside
        hidden={where === 'panel' ? !inPanel(note) : !isShown(note)}
        tabindex={where === 'gutter' ? 0 : -1}
        data-note-kind={note.kind}
        data-note-emphasis={emphasised() ? 'true' : undefined}
        data-mol-id={`margin-note-${where}-${note.id}`}
        ref={(host) => {
          if (where === 'gutter') webHover(host, () => ({ onEnter, onLeave }))
        }}
        onFocusIn={where === 'gutter' ? onEnter : undefined}
        onFocusOut={where === 'gutter' ? onLeave : undefined}
        class={cm.cn(
          cm.sp('p', 3),
          cm.textSize('sm'),
          cm.textMuted,
          emphasised() && cm.bgPrimarySubtle,
          emphasised() && cm.shadowLifted,
        )}
      >
        {rendered(note.content)}
      </aside>
    )
  }

  /**
   * The outer wrapper's inline style: React's `containerStyle`, which takes
   * the element's `webStyle` too (the web-only paint, after `style`, whose
   * `coverImage` is painted as the React element paints it).
   *
   * @returns The `style` attribute text.
   */
  const containerStyle = (): string | undefined =>
    reactStyleText(
      {
        ...props.style,
        ...props.webStyle,
        maxWidth: hasNotes()
          ? `calc(${props.measure ?? '38rem'} + ${props.gutterWidth ?? '18rem'} + 4rem)`
          : (props.measure ?? '38rem'),
      },
      ' ',
    )

  return (
    <div
      {...rest}
      class={cm.cn(cm.mxAuto, cm.w('full'), props.className)}
      style={containerStyle()}
      data-mol-id="margin-notes"
    >
      <Show when={hasNotes() && kinds().length > 0}>
        <div class={cm.cn(cm.hiddenBelow('md'), cm.sp('mb', 6))}>{switches('side')}</div>
      </Show>
      <div class={cm.cn(cm.textSize('xl'), cm.stack(0))}>
        <For each={rows()}>
          {(row) => {
            onCleanup(() => rowRefs.delete(row.id))
            return (
              <div
                ref={(el) => rowRefs.set(row.id, el)}
                class={cm.flex({ direction: 'row', align: 'start', gap: 'xl' })}
                data-mol-id={`margin-notes-row-${row.id}`}
              >
                <div
                  class={cm.flex1}
                  style={reactStyleText({ maxWidth: props.measure ?? '38rem', minWidth: 0 }, ' ')}
                >
                  <For each={row.blocks}>
                    {(block) => {
                      const ids = block.noteIds ?? []
                      const interactive = ids.length > 0
                      const tinted = (): boolean => !!activeNote() && ids.includes(activeNote()!)
                      const togglePin = (): void => {
                        setPinnedBlock((p) => (p === block.id ? null : block.id))
                      }
                      const enter = (): void => {
                        setActiveBlock(block.id)
                      }
                      const leave = (): void => {
                        setActiveBlock(null)
                      }
                      onCleanup(() => blockRefs.delete(block.id))
                      return (
                        <div
                          ref={(host) => {
                            blockRefs.set(block.id, host)
                            if (interactive)
                              webHover(host, () => ({ onEnter: enter, onLeave: leave }))
                          }}
                          id={block.id}
                          data-mol-id={`margin-notes-block-${block.id}`}
                          data-block-marked={block.marked ? 'true' : undefined}
                          data-block-pinned={pinnedBlock() === block.id ? 'true' : undefined}
                          onFocusIn={interactive ? enter : undefined}
                          onFocusOut={interactive ? leave : undefined}
                          class={cm.cn(cm.position('relative'), tinted() && cm.bgPrimarySubtle)}
                        >
                          <Show when={block.marked}>
                            <span
                              role={markNamed() ? 'img' : undefined}
                              aria-label={markNamed() ? props.markLabel : undefined}
                              aria-hidden={markNamed() ? undefined : 'true'}
                              data-mol-id={`margin-notes-mark-${block.id}`}
                              class={cm.cn(
                                cm.position('absolute'),
                                cm.roundedFull,
                                cm.bgPrimary,
                                cm.hiddenBelow('md'),
                              )}
                              style={reactStyleText(
                                {
                                  left: '-0.9rem',
                                  top: '0.75em',
                                  width: '6px',
                                  height: '6px',
                                },
                                ' ',
                              )}
                            />
                          </Show>
                          {rendered(block.content)}
                          <Show when={interactive}>
                            <div class={cm.cn(cm.hiddenFrom('md'), cm.flex({ justify: 'end' }))}>
                              <button
                                type="button"
                                aria-pressed={pinnedBlock() === block.id ? 'true' : 'false'}
                                aria-label={pinLabel()}
                                data-mol-id={`margin-notes-pin-${block.id}`}
                                onClick={togglePin}
                                class={cm.button({ variant: 'ghost', size: 'sm' })}
                              >
                                <Icon name="pin" size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </Show>
                        </div>
                      )
                    }}
                  </For>
                </div>
                <Show when={hasNotes()}>
                  <div
                    class={cm.cn(cm.hiddenBelow('md'), cm.stack(3))}
                    style={reactStyleText(
                      {
                        width: props.gutterWidth ?? '18rem',
                        flexShrink: 0,
                        paddingTop: noteOffsets()[row.id],
                      },
                      ' ',
                    )}
                    aria-label={t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' })}
                    role="complementary"
                  >
                    <For each={row.notes}>{(note) => noteView(note, 'gutter')}</For>
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
      </div>
      <Show when={hasNotes()}>
        {/* Room for the phone bar, so it never covers the last paragraph. */}
        <div
          class={cm.hiddenFrom('md')}
          style={reactStyleText({ height: '14rem' }, ' ')}
          aria-hidden="true"
        />
        <div
          class={cm.cn(
            cm.hiddenFrom('md'),
            cm.position('fixed'),
            cm.surface,
            cm.borderT,
            cm.shadowLifted,
            cm.sp('p', 3),
            cm.stack(2),
          )}
          style={reactStyleText({ left: 0, right: 0, bottom: 0, zIndex: 20 }, ' ')}
          data-mol-id="margin-notes-bar"
        >
          <div
            role="region"
            aria-live="polite"
            aria-label={t('marginNotes.aria.panel', undefined, {
              defaultValue: 'Notes for this section',
            })}
            style={reactStyleText({ maxHeight: '40vh', overflowY: 'auto' }, ' ')}
            data-mol-id="margin-notes-panel"
          >
            <For each={panelNotes()}>{(note) => noteView(note, 'panel')}</For>
            <Show when={pinnedBlock()}>
              <button
                type="button"
                onClick={() => {
                  setPinnedBlock(null)
                }}
                class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTarget)}
                data-mol-id="margin-notes-dismiss"
              >
                {t('marginNotes.dismiss', undefined, { defaultValue: 'Hide notes' })}
              </button>
            </Show>
          </div>
          {switches('bar')}
        </div>
      </Show>
    </div>
  )
}
