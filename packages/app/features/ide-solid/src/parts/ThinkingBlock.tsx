/**
 * Collapsible block for displaying AI thinking/reasoning content.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ThinkingBlock` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same behaviour. Auto-expanded while streaming so the user
 * can watch thinking in real time; once streaming ends the manual toggle takes
 * over, and the content auto-scrolls to the bottom as new thinking arrives.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes, with every length written as the `px` string the DOM serializes. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createSignal, on, onMount, Show } from 'solid-js'

import { formatThinkingDuration } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * The disclosure toggle's inline style: chevron + muted label, a summary/details
 * affordance with no button frame. A constant rather than an inline object, so
 * Solid writes it through the CSSOM exactly as React does (React normalizes the
 * `border`/`padding` shorthands; a literal style attribute would not).
 */
const THINKING_BUTTON_STYLE: Record<string, string> = {
  display: 'inline-flex',
  'align-items': 'center',
  gap: '4px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  padding: '2px 0',
}

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
export function ThinkingBlock(props: ThinkingBlockProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  // React's `useRef`: a plain, non-reactive holder the ref callback fills.
  const content: { current: HTMLDivElement | null } = { current: null }
  // Auto-expand while streaming so the user can see thinking in real-time.
  // Once streaming ends, the user's manual toggle takes over.
  const [manualToggle, setManualToggle] = createSignal<boolean | null>(null)
  /** Whether the body is visible: the manual choice, else the streaming default. */
  const open = (): boolean => manualToggle() ?? props.isStreaming === true

  /** Scrolls the body to its bottom as new thinking streams in. */
  const scrollToBottom = (): void => {
    if (open() && content.current) content.current.scrollTop = content.current.scrollHeight
  }

  // React's `useEffect([open, content])`: the first render and every later
  // change of either value.
  onMount(scrollToBottom)
  createEffect(
    on(
      () => [open(), props.content],
      () => scrollToBottom(),
      { defer: true },
    ),
  )

  /** The disclosure label: streaming, the recorded duration, or the brief default. */
  const label = (): string =>
    props.isStreaming
      ? t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
      : props.durationMs != null
        ? formatThinkingDuration(t, props.durationMs)
        : t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })

  return (
    <div style={{ 'margin-bottom': '6px' }}>
      <button
        /* mol-bespoke-button: thinking disclosure toggle — chevron + muted label, a summary/details affordance with no button frame */
        type="button"
        onClick={() => setManualToggle(!(manualToggle() ?? props.isStreaming === true))}
        style={THINKING_BUTTON_STYLE}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          style={{
            display: 'block',
            'flex-shrink': '0',
            opacity: '0.5',
            transform: open() ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        >
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{label()}</span>
      </button>
      <Show when={open()}>
        <div
          ref={(element: HTMLDivElement) => {
            content.current = element
          }}
          class={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{
            'padding-left': '16px',
            'margin-top': '4px',
            'max-height': '200px',
            'overflow-y': 'auto',
            'white-space': 'pre-wrap',
            'font-style': 'italic',
            opacity: '0.7',
          }}
        >
          {props.content}
        </div>
      </Show>
    </div>
  )
}
