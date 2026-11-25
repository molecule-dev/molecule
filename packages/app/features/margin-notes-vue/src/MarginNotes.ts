/**
 * Vue margin-notes reading layout — the counterpart of
 * `@molecule/app-margin-notes-react`'s `MarginNotes`, with the same props
 * (React names), the same ClassMap tokens, the same i18n keys and the same DOM
 * for the same input.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Icon, Switch } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { classOf, elementStyle, reactStyle, restAttrs, styleOf } from './attrs.js'
import { buildRows, defaultShownKinds } from './rows.js'
import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from './types.js'

/** Where a phone reader's "current section" is read: this fraction down the viewport. */
const READING_LINE = 0.35

/** Where a note is shown: the desktop notes column, or the phone bar's panel. */
type NotePlacement = 'gutter' | 'panel'

/** Where a switch group is shown: above the text, or in the phone bar. */
type SwitchPlacement = 'side' | 'bar'

/** Where one element's hover stands: inside or out, and whether a touch pointer last moved it. */
interface HoverState {
  inside: boolean
  fromTouch: boolean
}

/** The hover state of each element that reported an enter or a leave. */
const hoverStates = new WeakMap<Element, HoverState>()

/**
 * Routes the pointer and the mouse enter/leave of one element through a single
 * transition, as the React kit's element does (React's `MarginNotes` renders
 * its blocks and notes with it). Whichever stream arrives first makes the
 * transition and the other repeats nothing. A touch contact never hovers, nor
 * does the mouse event a browser raises after one, until a real pointer (a
 * mouse, a pen) enters.
 *
 * @param event - The enter or the leave, on the element it happened to.
 * @param entered - Whether it is an entry.
 * @returns Whether the element's hover changed.
 */
function hoverChanged(event: Event, entered: boolean): boolean {
  const element = event.currentTarget
  if (!(element instanceof Element)) return false
  const state = hoverStates.get(element) ?? { inside: false, fromTouch: false }
  hoverStates.set(element, state)
  if ('pointerType' in event) {
    state.fromTouch = event.pointerType === 'touch'
    if (state.fromTouch) return false
  } else if (state.fromTouch) {
    return false
  }
  if (state.inside === entered) return false
  state.inside = entered
  return true
}

/**
 * The enter and leave handlers of one hoverable element, both streams routed
 * through {@link hoverChanged}.
 *
 * @param onEnter - What an entry does.
 * @param onLeave - What a leave does.
 * @returns The handlers `h()` spreads onto the element.
 */
function hoverHandlers(onEnter: () => void, onLeave: () => void): Record<string, unknown> {
  const handler =
    (entered: boolean, run: () => void) =>
    (event: Event): void => {
      if (hoverChanged(event, entered)) run()
    }
  return {
    onPointerenter: handler(true, onEnter),
    onPointerleave: handler(false, onLeave),
    onMouseenter: handler(true, onEnter),
    onMouseleave: handler(false, onLeave),
  }
}

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
 * @param props - See {@link MarginNotesProps}.
 * @returns The layout component.
 */
export const MarginNotes = defineComponent({
  name: 'MarginNotes',
  inheritAttrs: false,
  props: {
    blocks: {
      type: Array as PropType<MarginNotesBlock[]>,
      required: true,
    },
    notes: {
      type: Array as PropType<MarginNote[]>,
      default: () => [],
    },
    kinds: {
      type: Array as PropType<MarginNoteKind[]>,
      default: () => [],
    },
    markLabel: String,
    measure: {
      type: String,
      default: '38rem',
    },
    gutterWidth: {
      type: String,
      default: '18rem',
    },
    shownKinds: {
      type: Array as PropType<string[]>,
      default: undefined,
    },
    onShownKindsChange: {
      type: Function as PropType<(shown: string[]) => void>,
      default: undefined,
    },
    className: String,
    style: {
      type: Object as PropType<MarginNotesProps['style']>,
      default: undefined,
    },
    webStyle: {
      type: Object as PropType<MarginNotesProps['webStyle']>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const pinLabel = computed(() =>
      t('marginNotes.aria.pin', undefined, {
        defaultValue: 'Pin the notes for this section',
      }),
    )
    // A named mark is an image named by `markLabel`; an unnamed one is
    // decorative (axe-core rejects an image with no name).
    const markNamed = computed(
      () => typeof props.markLabel === 'string' && props.markLabel.trim().length > 0,
    )

    const rows = computed(() => buildRows(props.blocks, props.notes))
    const notesById = computed(() => new Map(props.notes.map((n) => [n.id, n])))
    const hasNotes = computed(() => rows.value.some((r) => r.notes.length > 0))

    // Which kinds show. From props in the FIRST render (never an effect), so the
    // prerendered page already has the reader's defaults.
    const ownShown = ref<string[]>(defaultShownKinds(props.kinds))
    const shown = computed(() => props.shownKinds ?? ownShown.value)
    const switchable = computed(() => new Set(props.kinds.map((k) => k.id)))
    const isShown = (note: MarginNote): boolean =>
      !switchable.value.has(note.kind) || shown.value.includes(note.kind)
    const setShown = (kind: string, on: boolean): void => {
      const next = on ? [...new Set([...shown.value, kind])] : shown.value.filter((k) => k !== kind)
      if (props.shownKinds === undefined) ownShown.value = next
      props.onShownKindsChange?.(next)
    }

    // The two-way relationship: a hovered/focused block emphasises its notes; a
    // hovered/focused note tints the blocks it covers.
    const activeBlock = ref<string | null>(null)
    const activeNote = ref<string | null>(null)
    const activeBlockNotes = computed(() => {
      const b = activeBlock.value ? props.blocks.find((x) => x.id === activeBlock.value) : undefined
      return new Set(b?.noteIds ?? [])
    })

    // Phone: the section being read, and a block the reader pinned.
    const firstWithNotes = computed(() => rows.value.find((r) => r.noteIds.length > 0)?.id ?? null)
    const readingRow = ref<string | null>(firstWithNotes.value)
    const pinnedBlock = ref<string | null>(null)
    const rowRefs = new Map<string, HTMLElement>()
    // Each block registers the element this component rendered for it. Two
    // documents on a page can repeat block ids, and a lookup by id in the whole
    // document answers with the first one's.
    const blockRefs = new Map<string, HTMLElement>()

    /**
     * Reads the section being read: the last noted row whose top is at or above
     * the reading line.
     */
    const readRow = (): void => {
      if (!hasNotes.value) return
      const line = window.innerHeight * READING_LINE
      let current: string | null = null
      for (const row of rows.value) {
        const el = rowRefs.get(row.id)
        if (!el) continue
        if (el.getBoundingClientRect().top > line) break
        if (row.noteIds.length > 0) current = row.id
      }
      readingRow.value = current ?? firstWithNotes.value
    }

    // A row that opens on a heading (or any block with a top margin) starts its
    // text below the row's top; push the notes down by the same distance so a
    // note lines up with the first line it covers, not the margin above it.
    const noteOffsets = ref<Record<string, number>>({})
    const alignGutter = (): void => {
      const next: Record<string, number> = {}
      for (const row of rows.value) {
        if (row.notes.length === 0) continue
        const rowEl = rowRefs.get(row.id)
        const blockEl = blockRefs.get(row.blocks[0].id)
        const first = blockEl?.firstElementChild ?? blockEl
        if (!rowEl || !first) continue
        const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
        const offset = Math.max(0, Math.round(top))
        if (offset) next[row.id] = offset
      }
      if (JSON.stringify(noteOffsets.value) !== JSON.stringify(next)) noteOffsets.value = next
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
          if (hasNotes.value) alignGutter()
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
    let uninstallObserver: (() => void) | null = null
    onMounted(() => {
      uninstallObserver = installObserver()
    })
    watch(
      [hasNotes, rows, firstWithNotes],
      () => {
        uninstallObserver?.()
        uninstallObserver = installObserver()
      },
      { flush: 'post' },
    )
    onUnmounted(() => uninstallObserver?.())

    // Kinds that reach the panel only through a block's pin (notes about one paragraph).
    const tapOnly = computed(
      () => new Set(props.kinds.filter((k) => k.panel === 'tap').map((k) => k.id)),
    )
    const panelNoteIds = computed(() => {
      if (pinnedBlock.value)
        return props.blocks.find((b) => b.id === pinnedBlock.value)?.noteIds ?? []
      const ids = rows.value.find((r) => r.id === readingRow.value)?.noteIds ?? []
      // A tap kind follows the reader too once its switch is ON: turning the
      // switch on must show something on a phone, not wait for a pin.
      return ids.filter((id) => {
        const note = notesById.value.get(id)
        return !!note && (!tapOnly.value.has(note.kind) || isShown(note))
      })
    })
    // A pinned block's tap-kind notes show whatever their switch says: on a phone
    // the pin is the only way to reach a note about one paragraph (a prompt that
    // defaults off). Follow-kind notes keep obeying their switch.
    const inPanel = (note: MarginNote): boolean =>
      isShown(note) || (pinnedBlock.value !== null && tapOnly.value.has(note.kind))
    const panelNotes = computed(() =>
      panelNoteIds.value
        .map((id) => notesById.value.get(id))
        .filter((n): n is MarginNote => !!n && inPanel(n)),
    )

    /**
     * The kind switches, in the panel above the text or in the phone bar.
     *
     * @param placement - Where the group is rendered.
     * @returns The group, or null when the document has no kinds.
     */
    const switches = (placement: SwitchPlacement): VNode | null => {
      if (props.kinds.length === 0) return null
      return h(
        'div',
        {
          role: 'group',
          'aria-label': t('marginNotes.aria.toggles', undefined, {
            defaultValue: 'Show or hide notes',
          }),
          class: cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', align: 'center' }),
          'data-mol-id': `margin-notes-switches-${placement}`,
        },
        props.kinds.map((kind) =>
          h(Switch, {
            key: kind.id,
            label: kind.label,
            checked: shown.value.includes(kind.id),
            onChange: ({ target }: Event) => {
              if (target && 'checked' in target && typeof target.checked === 'boolean') {
                setShown(kind.id, target.checked)
              }
            },
            className: placement === 'bar' ? cm.touchTarget : cm.touchTargetCompact,
            'data-mol-id': `margin-notes-switch-${placement}-${kind.id}`,
          }),
        ),
      )
    }

    /**
     * One note, in the notes column or the phone panel.
     *
     * @param note - The note.
     * @param where - Which surface renders it.
     * @returns The note element.
     */
    const noteView = (note: MarginNote, where: NotePlacement): VNode => {
      const emphasised = activeBlockNotes.value.has(note.id) || activeNote.value === note.id
      return h(
        'aside',
        {
          key: note.id,
          hidden: where === 'panel' ? !inPanel(note) : !isShown(note),
          tabindex: where === 'gutter' ? 0 : -1,
          'data-note-kind': note.kind,
          'data-note-emphasis': emphasised ? 'true' : undefined,
          'data-mol-id': `margin-note-${where}-${note.id}`,
          ...(where === 'gutter'
            ? hoverHandlers(
                () => (activeNote.value = note.id),
                () => (activeNote.value = null),
              )
            : {}),
          onFocusin: where === 'gutter' ? () => (activeNote.value = note.id) : undefined,
          onFocusout: where === 'gutter' ? () => (activeNote.value = null) : undefined,
          class: cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            cm.textMuted,
            emphasised && cm.bgPrimarySubtle,
            emphasised && cm.shadowLifted,
          ),
        },
        [note.content as VNodeChild],
      )
    }

    /**
     * The outer wrapper's inline style: React's `containerStyle`, which takes
     * the element's `webStyle` too (the web-only paint, after `style`, whose
     * `coverImage` is painted as the React element paints it).
     *
     * @returns The style declarations.
     */
    const containerStyle = (): Record<string, string> => ({
      ...(reactStyle(elementStyle(props.style)) ?? {}),
      ...(reactStyle(props.webStyle) ?? {}),
      maxWidth: hasNotes.value
        ? `calc(${props.measure} + ${props.gutterWidth} + 4rem)`
        : props.measure,
    })

    return (): VNode =>
      h(
        'div',
        {
          ...restAttrs(attrs),
          class: cm.cn(cm.mxAuto, cm.w('full'), ...classOf(props.className, attrs)),
          style: styleOf(containerStyle(), attrs),
          'data-mol-id': 'margin-notes',
        },
        [
          hasNotes.value && props.kinds.length > 0
            ? h('div', { class: cm.cn(cm.hiddenBelow('md'), cm.sp('mb', 6)) }, [switches('side')])
            : null,
          h(
            'div',
            { class: cm.cn(cm.textSize('xl'), cm.stack(0)) },
            rows.value.map((row) =>
              h(
                'div',
                {
                  key: row.id,
                  ref: (el) => {
                    if (el) rowRefs.set(row.id, el as HTMLElement)
                    else rowRefs.delete(row.id)
                  },
                  class: cm.flex({ direction: 'row', align: 'start', gap: 'xl' }),
                  'data-mol-id': `margin-notes-row-${row.id}`,
                },
                [
                  h(
                    'div',
                    {
                      class: cm.flex1,
                      style: { maxWidth: props.measure, minWidth: '0px' },
                    },
                    row.blocks.map((block) => {
                      const ids = block.noteIds ?? []
                      const tinted = !!activeNote.value && ids.includes(activeNote.value)
                      const interactive = ids.length > 0
                      const togglePin = (): void => {
                        pinnedBlock.value = pinnedBlock.value === block.id ? null : block.id
                      }
                      return h(
                        'div',
                        {
                          key: block.id,
                          ref: (el) => {
                            if (el) blockRefs.set(block.id, el as HTMLElement)
                            else blockRefs.delete(block.id)
                          },
                          id: block.id,
                          'data-mol-id': `margin-notes-block-${block.id}`,
                          'data-block-marked': block.marked ? 'true' : undefined,
                          'data-block-pinned': pinnedBlock.value === block.id ? 'true' : undefined,
                          ...(interactive
                            ? hoverHandlers(
                                () => (activeBlock.value = block.id),
                                () => (activeBlock.value = null),
                              )
                            : {}),
                          onFocusin: interactive ? () => (activeBlock.value = block.id) : undefined,
                          onFocusout: interactive ? () => (activeBlock.value = null) : undefined,
                          class: cm.cn(cm.position('relative'), tinted && cm.bgPrimarySubtle),
                        },
                        [
                          block.marked
                            ? h('span', {
                                role: markNamed.value ? 'img' : undefined,
                                'aria-label': markNamed.value ? props.markLabel : undefined,
                                'aria-hidden': markNamed.value ? undefined : 'true',
                                'data-mol-id': `margin-notes-mark-${block.id}`,
                                class: cm.cn(
                                  cm.position('absolute'),
                                  cm.roundedFull,
                                  cm.bgPrimary,
                                  cm.hiddenBelow('md'),
                                ),
                                style: {
                                  left: '-0.9rem',
                                  top: '0.75em',
                                  width: '6px',
                                  height: '6px',
                                },
                              })
                            : null,
                          block.content as VNodeChild,
                          interactive
                            ? h(
                                'div',
                                {
                                  class: cm.cn(cm.hiddenFrom('md'), cm.flex({ justify: 'end' })),
                                },
                                [
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      'aria-pressed': pinnedBlock.value === block.id,
                                      'aria-label': pinLabel.value,
                                      'data-mol-id': `margin-notes-pin-${block.id}`,
                                      onClick: togglePin,
                                      class: cm.button({ variant: 'ghost', size: 'sm' }),
                                    },
                                    [h(Icon, { name: 'pin', size: 16, 'aria-hidden': 'true' })],
                                  ),
                                ],
                              )
                            : null,
                        ],
                      )
                    }),
                  ),
                  hasNotes.value
                    ? h(
                        'div',
                        {
                          class: cm.cn(cm.hiddenBelow('md'), cm.stack(3)),
                          style: {
                            width: props.gutterWidth,
                            flexShrink: 0,
                            paddingTop:
                              noteOffsets.value[row.id] !== undefined
                                ? `${noteOffsets.value[row.id]}px`
                                : undefined,
                          },
                          'aria-label': t('marginNotes.aria.notes', undefined, {
                            defaultValue: 'Notes',
                          }),
                          role: 'complementary',
                        },
                        row.notes.map((note) => noteView(note, 'gutter')),
                      )
                    : null,
                ],
              ),
            ),
          ),
          hasNotes.value
            ? h('div', {
                class: cm.hiddenFrom('md'),
                style: { height: '14rem' },
                'aria-hidden': 'true',
              })
            : null,
          hasNotes.value
            ? h(
                'div',
                {
                  class: cm.cn(
                    cm.hiddenFrom('md'),
                    cm.position('fixed'),
                    cm.surface,
                    cm.borderT,
                    cm.shadowLifted,
                    cm.sp('p', 3),
                    cm.stack(2),
                  ),
                  style: { left: '0px', right: '0px', bottom: '0px', zIndex: 20 },
                  'data-mol-id': 'margin-notes-bar',
                },
                [
                  h(
                    'div',
                    {
                      role: 'region',
                      'aria-live': 'polite',
                      'aria-label': t('marginNotes.aria.panel', undefined, {
                        defaultValue: 'Notes for this section',
                      }),
                      style: { maxHeight: '40vh', overflowY: 'auto' },
                      'data-mol-id': 'margin-notes-panel',
                    },
                    [
                      ...panelNotes.value.map((note) => noteView(note, 'panel')),
                      pinnedBlock.value
                        ? h(
                            'button',
                            {
                              type: 'button',
                              onClick: () => (pinnedBlock.value = null),
                              class: cm.cn(
                                cm.button({ variant: 'ghost', size: 'sm' }),
                                cm.touchTarget,
                              ),
                              'data-mol-id': 'margin-notes-dismiss',
                            },
                            [
                              t('marginNotes.dismiss', undefined, {
                                defaultValue: 'Hide notes',
                              }),
                            ],
                          )
                        : null,
                    ],
                  ),
                  switches('bar'),
                ],
              )
            : null,
        ],
      )
  },
})
