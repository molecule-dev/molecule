/**
 * Streaming indicator — animated molecule spinner with rotating status
 * messages. Replaces the blinking block cursor during AI response streaming.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `StreamingIndicator` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input. A real, non-empty `label` takes over from the rotating
 * phrases; `startedAt` adds a live `m:ss` elapsed timer (tenths while the wait
 * is short); `tokens` adds the estimated-output counter whose tooltip carries
 * the output-only qualifier. `inline` renders the spinner alone, as a compact
 * cursor replacement. The component is a part (React renders it inside
 * ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * The spinner SVG is the platform's single mark (`moleculeSpinnerMarkSvg`
 * from `@molecule/app-ui`), injected through the element's `innerHTML` — the
 * bond is the trust boundary, the same injection React's
 * `dangerouslySetInnerHTML` makes. All styling is inline: React's component
 * reads no ClassMap classes.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createSignal, createUniqueId, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-solid'

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
export function StreamingIndicator(props: StreamingIndicatorProps): JSX.Element {
  const { t } = useTranslation()
  const isNarrow = useNarrowViewport()
  // The gradient id is unique per instance — two svgs sharing one id
  // cross-reference each other's gradients (the spinner mark's own warning).
  const gradientId = `mol-stream-spinner-${createUniqueId().replace(/[:]/g, '')}`
  // React's `useState` seeds: the rotation's phrase index, and the clock the
  // elapsed timer reads — both start now and move only when their interval
  // fires, never per render.
  const [msgIdx, setMsgIdx] = createSignal(0)
  const [now, setNow] = createSignal(Date.now())

  // A real, non-empty label (current activity / verification step) takes
  // over; otherwise rotate generic phrases. Guard on a TRIMMED non-empty
  // string so the spinner is NEVER text-less — there should always be some
  // signal of what's happening, even if it's just "Working on it…".
  const hasLabel = (): boolean => props.label != null && props.label.trim() !== ''
  const elapsedMs = (): number =>
    props.startedAt !== undefined ? Math.max(0, now() - props.startedAt) : 0
  // Tick sub-second while the wait is short so the tenths are real (and it
  // reads as actively working), then drop to once per second past 10s to
  // bound re-renders on long turns.
  const tickFast = (): boolean => props.startedAt !== undefined && elapsedMs() < 10_000
  const elapsed = (): string | null =>
    props.startedAt !== undefined ? formatElapsed(elapsedMs()) : null
  const showTokens = (): boolean =>
    !isNarrow() && props.tokens != null && props.tokens >= MIN_TOKENS_SHOWN
  const text = (): string => {
    if (hasLabel() && props.label) return props.label
    const generic = MESSAGES[msgIdx()]!
    return t(generic.key, undefined, { defaultValue: generic.defaultValue })
  }

  createEffect(() => {
    if (props.inline || hasLabel()) return
    const id = setInterval(
      () => setMsgIdx((prev) => (prev + 1) % MESSAGES.length),
      ROTATE_INTERVAL_MS,
    )
    onCleanup(() => clearInterval(id))
  })
  createEffect(() => {
    if (props.inline || props.startedAt === undefined) return
    const id = setInterval(() => setNow(Date.now()), tickFast() ? 100 : 1000)
    onCleanup(() => clearInterval(id))
  })

  const spinner = (size: number): JSX.Element => (
    <span
      style={{ display: 'inline-flex', 'flex-shrink': '0' }}
      innerHTML={moleculeSpinnerMarkSvg({ size, gradientId })}
    />
  )

  return (
    <Show when={!props.inline} fallback={spinner(14)}>
      <div
        role="status"
        aria-label={text()}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          padding: '6px 0px',
          width: '100%',
          'min-width': '0px',
        }}
      >
        {spinner(16)}
        <span
          style={{
            'font-size': '13px',
            opacity: '0.7',
            'font-style': 'italic',
            'white-space': 'nowrap',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
          }}
        >
          {text()}
        </span>
        {elapsed() || showTokens() ? (
          // Status metrics pushed to the right edge; the spinner + label stay
          // left. On PHONE-width viewports the token estimate is dropped
          // entirely (it starves the label) and only the slim elapsed timer
          // stays — label legibility wins; /cost still carries the numbers.
          <span
            aria-hidden="true"
            style={{
              'margin-left': 'auto',
              display: 'inline-flex',
              'align-items': 'baseline',
              gap: '8px',
              'font-size': '13px',
              opacity: '0.7',
              'font-variant-numeric': 'tabular-nums',
              'white-space': 'nowrap',
              'flex-shrink': '0',
            }}
          >
            {showTokens() && (
              <Tooltip
                content={t('ide.chat.streamingOutputTokensHint', undefined, {
                  defaultValue: 'Estimated output tokens this turn — /cost shows input and cached.',
                })}
                placement="top"
              >
                <span>
                  {t(
                    'ide.chat.streamingOutputTokens',
                    { count: formatTokens(props.tokens as number) },
                    { defaultValue: '~{{count}} tokens' },
                  )}
                </span>
              </Tooltip>
            )}
            {showTokens() && elapsed() ? <span>·</span> : null}
            {elapsed() ? <span>{elapsed()}</span> : null}
          </span>
        ) : null}
      </div>
    </Show>
  )
}
