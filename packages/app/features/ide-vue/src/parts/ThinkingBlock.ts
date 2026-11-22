/**
 * Collapsible block for displaying AI thinking/reasoning content.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ThinkingBlock` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same behaviour. Auto-expanded while streaming so the user can
 * watch thinking in real time; once streaming ends the manual toggle takes
 * over, and the content auto-scrolls to the bottom as new thinking arrives.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes, with every length written as a `px` string (Vue does not add the unit
 * React adds for a number). All user-facing text goes through `t()`.
 *
 * @module
 */

import { computed, defineComponent, h, onMounted, ref, type VNodeChild, watch } from 'vue'

import { formatThinkingDuration } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/** Props for {@link ThinkingBlock} — the React prop names, React's own contract. */
export interface ThinkingBlockProps {
  /** The thinking / reasoning text. */
  content: string
  /** How long the model thought, when the run recorded it. */
  durationMs?: number
  /** Whether the block is still receiving content. */
  isStreaming?: boolean
}

/**
 * Collapsible block for displaying AI thinking/reasoning content.
 *
 * @param props - See {@link ThinkingBlockProps}.
 * @returns The rendered thinking block element.
 */
export const ThinkingBlock = defineComponent({
  name: 'ThinkingBlock',
  props: {
    /** The thinking / reasoning text. */
    content: { type: String, required: true },
    /** How long the model thought, when the run recorded it. */
    durationMs: { type: Number, required: false, default: undefined },
    /** Whether the block is still receiving content. */
    isStreaming: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const contentRef = ref<HTMLDivElement | null>(null)
    // Auto-expand while streaming so the user can see thinking in real-time.
    // Once streaming ends, the user's manual toggle takes over.
    const manualToggle = ref<boolean | null>(null)
    const open = computed<boolean>(() => manualToggle.value ?? props.isStreaming === true)

    /**
     * Scrolls the content to its bottom as new thinking streams in.
     */
    const scrollToBottom = (): void => {
      const el = contentRef.value
      if (open.value && el) el.scrollTop = el.scrollHeight
    }

    // React's `useEffect([open, content])`: the first render and every later
    // change of either value.
    onMounted(scrollToBottom)
    watch([open, () => props.content], scrollToBottom, { flush: 'post' })

    /** The disclosure label: streaming, the recorded duration, or the brief default. */
    const label = (): string =>
      props.isStreaming
        ? t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
        : props.durationMs != null
          ? formatThinkingDuration(t, props.durationMs)
          : t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })

    return (): VNodeChild =>
      h('div', { style: { marginBottom: '6px' } }, [
        h(
          'button',
          {
            type: 'button',
            onClick: () => {
              manualToggle.value = !(manualToggle.value ?? props.isStreaming === true)
            },
            style: {
              display: 'inline-flex',
              'align-items': 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px 0',
            },
          },
          [
            h(
              'svg',
              {
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: '0 0 16 16',
                width: '12',
                height: '12',
                style: {
                  display: 'block',
                  'flex-shrink': '0',
                  opacity: '0.5',
                  transform: open.value ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms',
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
            ),
            h('span', { class: cm.cn(cm.textMuted, cm.textSize('xs')) }, label()),
          ],
        ),
        open.value
          ? h(
              'div',
              {
                ref: contentRef,
                class: cm.cn(cm.textMuted, cm.textSize('xs')),
                style: {
                  'padding-left': '16px',
                  'margin-top': '4px',
                  'max-height': '200px',
                  'overflow-y': 'auto',
                  'white-space': 'pre-wrap',
                  'font-style': 'italic',
                  opacity: '0.7',
                },
              },
              props.content,
            )
          : null,
      ])
  },
})
