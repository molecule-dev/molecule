/**
 * Expandable commit card for the chat timeline.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `CommitCardItem` (see that file
 * for the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. The label renders the commit message with any
 * trailing `Co-authored-by:` attribution trailer STRIPPED through the shared
 * `stripCommitCoauthorTrailer` — the endpoint returns the full git message, and
 * that attribution is noise the user never wrote. Clicking the row discloses the
 * committed files; a done commit with a hash offers revert/redo (as a sibling of
 * the row button, never nested inside it), when the host wires `onRevert`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes (status dot, row geometry, disclosure), in Vue's kebab-case style form.
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import { type CommitCard, stripCommitCoauthorTrailer } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { useCoarsePointer } from '../hooks/useViewport.js'

export type { CommitCard }

/** Props for {@link CommitCardItem} — the React prop names, React's own contract. */
export interface CommitCardItemProps {
  /** The commit to render. */
  card: CommitCard
  /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
  onRevert?: (hash: string) => Promise<string | undefined>
}

/** The monospace figure stack React writes for the commit message. */
const MONO_FONT = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

/** The row's wrapping/ellipsis style (React's truncated single line unless expanded). */
const clampStyle = (expanded: boolean): Record<string, string> => ({
  flex: '1',
  'min-width': '0',
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': expanded ? 'normal' : 'nowrap',
})

/**
 * Expandable tool-call-style card displaying a commit with its files.
 *
 * @param props - See {@link CommitCardItemProps}.
 * @returns The rendered commit card.
 */
export const CommitCardItem = defineComponent({
  name: 'CommitCardItem',
  props: {
    /** The commit to render. */
    card: { type: Object as PropType<CommitCard>, required: true },
    /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
    onRevert: {
      type: Function as PropType<(hash: string) => Promise<string | undefined>>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const isCoarse = useCoarsePointer()
    const expanded = ref(false)
    const hovered = ref(false)
    const reverting = ref(false)
    // Track undo/redo state: each revert produces a new hash that can itself be reverted.
    const reverted = ref(false)
    const revertHash = ref<string | undefined>(undefined)
    // The revert control is a SIBLING of the row button, so the row's hover no
    // longer covers the last pixel of travel to it — its own hover keeps it
    // revealed (without this, leaving the row would hide it under the pointer).
    const revertHovered = ref(false)

    /** Whether the commit lists any files (the disclosure affordance). */
    const hasFiles = (): boolean => props.card.files.length > 0
    /** Whether the commit is still in flight. */
    const isRunning = (): boolean => props.card.status === 'running'
    /** Whether the undo/redo control is offered. */
    const canRevert = (): boolean =>
      props.card.status === 'done' &&
      !!(reverted.value ? revertHash.value : props.card.hash) &&
      !!props.onRevert
    /** The status dot's colour: orange running, red error, blue done. */
    const dotColor = (): string =>
      isRunning() ? '#e8a000' : props.card.status === 'error' ? '#f04040' : '#4070e0'

    /**
     * Reverts (or re-applies) the commit, then offers the reverse operation.
     *
     * @param event - The click or key event that asked for it.
     */
    const handleRevert = async (event: Event): Promise<void> => {
      event.stopPropagation()
      if (!canRevert() || reverting.value) return
      const hash = reverted.value ? revertHash.value : props.card.hash
      if (!hash || !props.onRevert) return
      reverting.value = true
      try {
        const newHash = await props.onRevert(hash)
        if (newHash) {
          revertHash.value = newHash
          reverted.value = !reverted.value
        }
      } finally {
        reverting.value = false
      }
    }

    /**
     * Reveals the revert control while the pointer is over it (React's
     * `onMouseEnter`), which also keeps it visible on the way out.
     *
     * @param event - The native mouse event.
     */
    const onRevertEnter = (event: MouseEvent): void => {
      revertHovered.value = true
      const el = event.currentTarget as HTMLElement
      el.style.background = 'rgba(128,128,128,0.2)'
      el.style.opacity = '1'
    }

    /**
     * Returns the revert control to its resting look (React's `onMouseLeave`).
     *
     * @param event - The native mouse event.
     */
    const onRevertLeave = (event: MouseEvent): void => {
      revertHovered.value = false
      const el = event.currentTarget as HTMLElement
      el.style.background = 'transparent'
      el.style.opacity = ''
    }

    /**
     * Renders the card.
     *
     * @returns The rendered commit card.
     */
    return (): VNodeChild => {
      const header = h(
        'button',
        {
          type: 'button',
          onClick: hasFiles()
            ? () => {
                expanded.value = !expanded.value
              }
            : undefined,
          onMouseenter: () => {
            hovered.value = true
          },
          onMouseleave: () => {
            hovered.value = false
          },
          style: {
            display: 'flex',
            'align-items': 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: hasFiles() ? 'pointer' : 'default',
            color: 'inherit',
            'text-align': 'left',
            padding: '2px 0',
            width: '100%',
            'min-width': '0',
          },
        },
        [
          h(
            'svg',
            {
              width: '10',
              height: '10',
              viewBox: '0 0 10 10',
              style: { 'flex-shrink': '0', 'margin-top': '5px' },
            },
            [
              h('circle', { cx: '5', cy: '5', r: '3', fill: dotColor(), opacity: '0.35' }),
              h('circle', {
                cx: '5',
                cy: '5',
                r: '3',
                fill: 'none',
                stroke: dotColor(),
                'stroke-width': '2',
              }),
            ],
          ),
          h('span', { style: clampStyle(expanded.value) }, [
            h(
              'span',
              {
                style: {
                  'font-size': '13px',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '5px',
                },
              },
              [
                h(
                  'span',
                  {
                    style: clampStyle(expanded.value),
                  },
                  isRunning()
                    ? t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
                    : [
                        t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' }),
                        ' ',
                        h(
                          'code',
                          { style: { 'font-family': MONO_FONT, 'font-size': 'inherit' } },
                          stripCommitCoauthorTrailer(props.card.message),
                        ),
                      ],
                ),
              ],
            ),
            hasFiles() && !expanded.value
              ? h(
                  'span',
                  {
                    class: cm.cn(cm.textMuted, cm.textSize('xs')),
                    style: { display: 'block', 'margin-top': '1px' },
                  },
                  t(
                    'ide.chat.fileCount',
                    { count: props.card.files.length },
                    { defaultValue: '{{count}} files' },
                  ),
                )
              : null,
          ]),
          hasFiles()
            ? h(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  viewBox: '0 0 16 16',
                  width: '14',
                  height: '14',
                  style: {
                    display: 'block',
                    'flex-shrink': '0',
                    'margin-top': '3px',
                    transform: expanded.value ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 150ms, opacity 100ms',
                    opacity: hovered.value ? '0.85' : '0.35',
                  },
                },
                [
                  h('polyline', {
                    points: '6,4 10,8 6,12',
                    fill: 'none',
                    stroke: 'currentColor',
                    'stroke-width': '1.5',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                  }),
                ],
              )
            : null,
        ],
      )

      const revert = canRevert()
        ? h(
            'span',
            {
              role: 'button',
              tabindex: '0',
              title: reverted.value
                ? t('ide.chat.redoCommit', undefined, { defaultValue: 'Re-apply this commit' })
                : t('ide.chat.revertCommit', undefined, { defaultValue: 'Revert this commit' }),
              onClick: (event: MouseEvent) => void handleRevert(event),
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  void handleRevert(event)
                }
              },
              onMouseenter: onRevertEnter,
              onMouseleave: onRevertLeave,
              style: {
                display: 'inline-flex',
                'align-items': 'center',
                'justify-content': 'center',
                'align-self': 'flex-start',
                width: isCoarse.value ? '32px' : '20px',
                height: isCoarse.value ? '32px' : '20px',
                'border-radius': '4px',
                'flex-shrink': '0',
                cursor: reverting.value ? 'wait' : 'pointer',
                opacity: reverting.value
                  ? '0.3'
                  : hovered.value || isCoarse.value || revertHovered.value
                    ? '0.6'
                    : '0',
                transition: 'opacity 100ms, background 100ms',
              },
            },
            [
              h(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  viewBox: '0 0 16 16',
                  width: '13',
                  height: '13',
                  fill: 'currentColor',
                },
                [
                  h('path', {
                    d: reverted.value
                      ? 'M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z'
                      : 'M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z',
                  }),
                ],
              ),
            ],
          )
        : null

      // The file list sits inside the row, where React renders it.
      const detail =
        expanded.value && hasFiles()
          ? h(
              'div',
              {
                class: cm.surfaceSecondary,
                style: {
                  'margin-left': '14px',
                  'margin-top': '4px',
                  'margin-bottom': '4px',
                  'border-radius': '4px',
                  'overflow-x': 'auto',
                  padding: '6px 10px',
                },
              },
              [
                h(
                  'div',
                  {
                    style: { 'font-family': MONO_FONT, 'font-size': '11px', 'line-height': '1.6' },
                  },
                  props.card.files.map((file) => {
                    const path = typeof file === 'string' ? file : (file as { path: string }).path
                    return h('div', { key: path }, path)
                  }),
                ),
              ],
            )
          : null

      return h('div', { style: { 'margin-bottom': `${TIMELINE_ITEM_GAP}px` } }, [
        h(
          'div',
          { style: { 'margin-bottom': '4px', display: 'flex', 'align-items': 'flex-start' } },
          [header, revert, detail],
        ),
      ])
    }
  },
})
