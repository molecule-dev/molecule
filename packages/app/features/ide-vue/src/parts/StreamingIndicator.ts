/**
 * Streaming indicator — animated molecule spinner with rotating status
 * messages. Replaces the blinking block cursor during AI response streaming.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `StreamingIndicator` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input. A real, non-empty `label` takes over from the rotating
 * phrases; `startedAt` adds a live `m:ss` elapsed timer (tenths while the wait
 * is short); `tokens` adds the estimated-output counter whose tooltip carries
 * the output-only qualifier. `inline` renders the spinner alone, as a compact
 * cursor replacement. The component is a part (React renders it inside
 * ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * The spinner SVG is the platform's single mark (`moleculeSpinnerMarkSvg`
 * from `@molecule/app-ui`), injected through `innerHTML` — the bond is the
 * trust boundary, the same injection React's `dangerouslySetInnerHTML` makes.
 * All styling is inline: React's component reads no ClassMap classes.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  useId,
  type VNodeChild,
  watchPostEffect,
} from 'vue'

import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { useNarrowViewport } from '../hooks/useViewport.js'

/**
 * Molecule-themed status phrases, in rotation order. The agent, Synthase, is
 * named after ATP synthase — the enzyme that synthesizes the cell's energy —
 * so the spinner rotates through a biochemical reaction (synthesize → analyze
 * structure → trace pathway → compose → react → catalyze → bond → crystallize)
 * instead of generic "Thinking…/Working…". The keys are unchanged so the
 * existing per-locale translations stay valid — the theme is an English
 * flourish in these defaults (the same convention the preview phrases use).
 */
const MESSAGES: ReadonlyArray<{ key: string; defaultValue: string }> = [
  { key: 'ide.chat.streaming.thinking', defaultValue: 'Synthesizing...' },
  { key: 'ide.chat.streaming.analyzing', defaultValue: 'Analyzing the structure...' },
  { key: 'ide.chat.streaming.reasoning', defaultValue: 'Tracing the pathway...' },
  { key: 'ide.chat.streaming.crafting', defaultValue: 'Composing the response...' },
  { key: 'ide.chat.streaming.working', defaultValue: 'Reacting to your request...' },
  { key: 'ide.chat.streaming.processing', defaultValue: 'Catalyzing...' },
  { key: 'ide.chat.streaming.connecting', defaultValue: 'Bonding the concepts...' },
  { key: 'ide.chat.streaming.almostThere', defaultValue: 'Crystallizing the answer...' },
]

/** Milliseconds one status phrase stays on screen before the next replaces it. */
const ROTATE_INTERVAL_MS = 3000

/**
 * Minimum estimated tokens before the counter is shown. Below this the number
 * is noise — e.g. a `set_mode` tool input is ~4 tokens, which looked silly
 * flashing at the plan switch. Real generation crosses this within a fraction
 * of a second, so the counter still appears effectively immediately.
 */
const MIN_TOKENS_SHOWN = 20

/**
 * Format elapsed milliseconds as `m:ss` (or `s.s` under 10s for liveliness).
 * @param ms - Elapsed time in milliseconds.
 * @returns The formatted elapsed string.
 */
function formatElapsed(ms: number): string {
  const totalSec = ms / 1000
  if (totalSec < 10) return `${totalSec.toFixed(1)}s`
  const sec = Math.floor(totalSec)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/**
 * Format a token count compactly (e.g. 1234 → "1.2k").
 * @param n - The token count.
 * @returns The compact string.
 */
function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

/** Props for {@link StreamingIndicator} — the React prop names, React's own contract. */
export interface StreamingIndicatorProps {
  /** When true, renders only the spinner inline (no message text). */
  inline?: boolean
  /**
   * Real current-activity label (e.g. "Reading src/App.tsx", "Writing the
   * plan"). When provided, it replaces the generic rotating messages so the
   * user sees what's actually happening. Falls back to rotation when absent.
   */
  label?: string
  /**
   * Turn start timestamp (ms). When provided, a live `m:ss` elapsed counter
   * ticks beside the label so it's unambiguous the response is still alive
   * (vs. a frozen spinner) even during long model-latency gaps.
   */
  startedAt?: number
  /**
   * Estimated OUTPUT tokens generated so far this turn — assistant text,
   * thinking, and tool-call arguments, at ~4 chars/token. When > 0, shown
   * beside the timer so the user can see how much work is actually being
   * done. Deliberately not a total: it excludes every input token, and an
   * agentic turn re-sends the whole conversation on each iteration, so the
   * provider's own dashboard will read far higher. That is not a discrepancy
   * — it is a different measure, which the tooltip states (the visible label
   * stays the plain unit to keep the row narrow).
   */
  tokens?: number | null
}

/**
 * Animated streaming indicator with molecule spinner. Shows the real current
 * activity (when `label` is passed) plus a live elapsed timer (when
 * `startedAt` is passed); otherwise rotates generic status messages. Pass
 * `inline` for a compact cursor replacement inside flowing text.
 *
 * @param props - See {@link StreamingIndicatorProps}.
 * @returns The rendered streaming indicator.
 */
export const StreamingIndicator = defineComponent({
  name: 'StreamingIndicator',
  props: {
    /** When true, renders only the spinner inline (no message text). */
    inline: { type: Boolean, required: false, default: undefined },
    /** Real current-activity label; absent (or blank) falls back to rotation. */
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
    /** Turn start timestamp (ms); absent renders no elapsed timer. */
    startedAt: {
      type: Number as PropType<number | undefined>,
      required: false,
      default: undefined,
    },
    /**
     * Estimated OUTPUT tokens this turn; `null`/absent (and anything under
     * {@link MIN_TOKENS_SHOWN}) renders no counter.
     */
    tokens: {
      type: Number as PropType<number | null | undefined>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useTranslation()
    const isNarrow = useNarrowViewport()
    // The gradient id is unique per instance — two svgs sharing one id
    // cross-reference each other's gradients (the spinner mark's own warning).
    const gradientId = `mol-stream-spinner-${useId().replace(/[:]/g, '')}`
    // React's `useState` seeds: the rotation's phrase index, and the clock the
    // elapsed timer reads — both start now and move only when their interval
    // fires, never per render.
    const msgIdx = ref(0)
    const now = ref(Date.now())

    // A real, non-empty label (current activity / verification step) takes
    // over; otherwise rotate generic phrases. Guard on a TRIMMED non-empty
    // string so the spinner is NEVER text-less — there should always be some
    // signal of what's happening, even if it's just "Working on it…".
    const hasLabel = computed(() => props.label != null && props.label.trim() !== '')
    const elapsedMs = computed(() =>
      props.startedAt !== undefined ? Math.max(0, now.value - props.startedAt) : 0,
    )
    // Tick sub-second while the wait is short so the tenths are real (and it
    // reads as actively working), then drop to once per second past 10s to
    // bound re-renders on long turns.
    const tickFast = computed(() => props.startedAt !== undefined && elapsedMs.value < 10_000)

    watchPostEffect((onCleanup) => {
      if (props.inline || hasLabel.value) return
      const id = setInterval(() => {
        msgIdx.value = (msgIdx.value + 1) % MESSAGES.length
      }, ROTATE_INTERVAL_MS)
      onCleanup(() => clearInterval(id))
    })
    watchPostEffect((onCleanup) => {
      if (props.inline || props.startedAt === undefined) return
      const id = setInterval(
        () => {
          now.value = Date.now()
        },
        tickFast.value ? 100 : 1000,
      )
      onCleanup(() => clearInterval(id))
    })

    return (): VNodeChild => {
      if (props.inline) {
        return h('span', {
          style: { display: 'inline-flex', flexShrink: '0' },
          innerHTML: moleculeSpinnerMarkSvg({ size: 14, gradientId }),
        })
      }
      const generic = MESSAGES[msgIdx.value]!
      const text =
        hasLabel.value && props.label
          ? props.label
          : t(generic.key, undefined, { defaultValue: generic.defaultValue })
      const elapsed = props.startedAt !== undefined ? formatElapsed(elapsedMs.value) : null
      const tokens = props.tokens
      const showTokens = !isNarrow.value && tokens != null && tokens >= MIN_TOKENS_SHOWN
      return h(
        'div',
        {
          role: 'status',
          'aria-label': text,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 0',
            width: '100%',
            minWidth: '0px',
          },
        },
        [
          h('span', {
            style: { display: 'inline-flex', flexShrink: '0' },
            innerHTML: moleculeSpinnerMarkSvg({ size: 16, gradientId }),
          }),
          h(
            'span',
            {
              style: {
                fontSize: '13px',
                opacity: '0.7',
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
            [text],
          ),
          // Status metrics pushed to the right edge; the spinner + label stay
          // left. On PHONE-width viewports the token estimate is dropped
          // entirely (it starves the label) and only the slim elapsed timer
          // stays — label legibility wins; /cost still carries the numbers.
          elapsed || showTokens
            ? h(
                'span',
                {
                  'aria-hidden': 'true',
                  style: {
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    fontSize: '13px',
                    opacity: '0.7',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    flexShrink: '0',
                  },
                },
                [
                  showTokens
                    ? h(
                        Tooltip,
                        {
                          content: t('ide.chat.streamingOutputTokensHint', undefined, {
                            defaultValue:
                              'Estimated output tokens this turn — /cost shows input and cached.',
                          }),
                          placement: 'top',
                        },
                        () =>
                          h('span', [
                            t(
                              'ide.chat.streamingOutputTokens',
                              { count: formatTokens(tokens as number) },
                              { defaultValue: '~{{count}} tokens' },
                            ),
                          ]),
                      )
                    : null,
                  showTokens && elapsed ? h('span', ['·']) : null,
                  elapsed ? h('span', [elapsed]) : null,
                ],
              )
            : null,
        ],
      )
    }
  },
})
