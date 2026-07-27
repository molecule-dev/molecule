/**
 * Streaming indicator — animated molecule spinner with rotating status
 * messages. Replaces the blinking block cursor during AI response streaming.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

// ---------------------------------------------------------------------------
// Molecule spinner — inline SVG (3-phase atom-swapping animation)
// ---------------------------------------------------------------------------

const DUR = '1.5s'
const EASE = '0.42 0 0.58 1'
const LIN = '0 0 1 1'

/**
 * Animated molecule logo spinner (pure SVG, no external deps).
 * @param props - Component props (see {@link StreamingIndicatorProps}).
 * @returns The rendered SVG spinner element.
 */
function MolSpinner({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ color: 'var(--mol-color-primary, #4070e0)', flexShrink: 0 }}
    >
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 16 16"
          to="360 16 16"
          dur="3s"
          repeatCount="indefinite"
        />
        <g
          transform="matrix(.86229 0 0 .86229 -.78879 2.2034)"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit={10}
          strokeWidth={2.4737}
          fill="none"
        >
          {/* Bond: Center–Left */}
          <line x1="16.494" x2="8.563" y1="16" y2="16">
            <animate
              attributeName="opacity"
              dur={DUR}
              repeatCount="indefinite"
              values="1;0;0;1;1"
              keyTimes="0;0.033;0.167;0.217;1"
              calcMode="spline"
              keySplines={[EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Bond: Center–Bottom-right */}
          <line x1="20.959" x2="24.924" y1="18.579" y2="25.446">
            <animate
              attributeName="opacity"
              dur={DUR}
              repeatCount="indefinite"
              values="1;1;0;0;1;1"
              keyTimes="0;0.333;0.367;0.500;0.550;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Bond: Center–Top-right */}
          <line x1="20.959" x2="24.924" y1="13.422" y2="6.555">
            <animate
              attributeName="opacity"
              dur={DUR}
              repeatCount="indefinite"
              values="1;1;0;0;1;1"
              keyTimes="0;0.667;0.700;0.833;0.883;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Atom 0: Center → Left */}
          <circle cx="19.47" cy="16" r="2.976">
            <animate
              attributeName="cx"
              dur={DUR}
              repeatCount="indefinite"
              values="19.47;19.47;5.587;5.587"
              keyTimes="0;0.033;0.167;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 1: Left → Center → Bottom-right */}
          <circle cx="5.587" cy="16" r="2.976">
            <animate
              attributeName="cx"
              dur={DUR}
              repeatCount="indefinite"
              values="5.587;5.587;19.47;19.47;26.412;26.412"
              keyTimes="0;0.033;0.167;0.367;0.500;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy"
              dur={DUR}
              repeatCount="indefinite"
              values="16;16;16;16;28.023;28.023"
              keyTimes="0;0.033;0.167;0.367;0.500;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 2: Bottom-right → Center → Top-right */}
          <circle cx="26.412" cy="28.023" r="2.976">
            <animate
              attributeName="cx"
              dur={DUR}
              repeatCount="indefinite"
              values="26.412;26.412;19.47;19.47;26.412;26.412"
              keyTimes="0;0.367;0.500;0.700;0.833;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy"
              dur={DUR}
              repeatCount="indefinite"
              values="28.023;28.023;16;16;3.977;3.977"
              keyTimes="0;0.367;0.500;0.700;0.833;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 3: Top-right → Center */}
          <circle cx="26.412" cy="3.977" r="2.976">
            <animate
              attributeName="cx"
              dur={DUR}
              repeatCount="indefinite"
              values="26.412;26.412;19.47;19.47"
              keyTimes="0;0.700;0.833;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy"
              dur={DUR}
              repeatCount="indefinite"
              values="3.977;3.977;16;16"
              keyTimes="0;0.700;0.833;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN].join(';')}
            />
          </circle>
        </g>
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Rotating status messages
// ---------------------------------------------------------------------------

// Molecule-themed status phrases. The agent, Synthase, is named after ATP synthase —
// the enzyme that synthesizes the cell's energy — so the spinner rotates through a
// biochemical reaction (synthesize → analyze structure → trace pathway → compose →
// react → catalyze → bond → crystallize) instead of generic "Thinking…/Working…". It
// reads with personality while still clearly signaling "actively working", and echoes
// the preview overlay's themed phrases (PreviewPanel). The keys are unchanged so the
// existing per-locale translations stay valid — the theme is an English flourish in
// these defaults (the same convention the preview phrases use).
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

const ROTATE_INTERVAL_MS = 3000

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

/**
 * Minimum estimated tokens before the counter is shown. Below this the number
 * is noise — e.g. a `set_mode` tool input is ~4 tokens, which looked silly
 * flashing at the plan switch. Real generation crosses this within a fraction
 * of a second, so the counter still appears effectively immediately.
 */
const MIN_TOKENS_SHOWN = 20

// ---------------------------------------------------------------------------
// StreamingIndicator
// ---------------------------------------------------------------------------

/** Props for {@link StreamingIndicator} — the spinner, activity label, and the live turn metrics. */
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
   * thinking, and tool-call arguments, at ~4 chars/token. When > 0, shown beside
   * the timer so the user can see how much work is actually being done.
   *
   * Deliberately not a total: it excludes every input token, and an agentic turn
   * re-sends the whole conversation on each iteration, so the provider's own
   * dashboard will read far higher. That is not a discrepancy — it is a different
   * measure, which the tooltip states (the visible label stays the plain unit to
   * keep the row narrow). `/cost` reports the input, cached and billed figures
   * (mid-stream too; the server folds the in-flight turn into the totals).
   */
  tokens?: number
}

/**
 * Animated streaming indicator with molecule spinner. Shows the real current
 * activity (when `label` is passed) plus a live elapsed timer (when `startedAt`
 * is passed); otherwise rotates generic status messages. Pass `inline` for a
 * compact cursor replacement inside flowing text.
 * @param props - Component props (see {@link StreamingIndicatorProps}).
 * @returns The rendered streaming indicator element.
 */
export function StreamingIndicator({
  inline,
  label,
  startedAt,
  tokens,
}: StreamingIndicatorProps): JSX.Element {
  const [msgIdx, setMsgIdx] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // A real, non-empty label (current activity / verification step) takes over;
  // otherwise rotate generic phrases. Guard on a TRIMMED non-empty string so the
  // spinner is NEVER text-less — there should always be some signal of what's
  // happening, even if it's just "Working on it…".
  const hasLabel = label != null && label.trim() !== ''
  useEffect(() => {
    if (inline || hasLabel) return
    const id = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [inline, hasLabel])

  // Live elapsed time. Tick sub-second while the wait is short so the tenths
  // are real (and it reads as actively working), then drop to once per second
  // past 10s to bound re-renders on long turns.
  const elapsedMs = startedAt !== undefined ? Math.max(0, now - startedAt) : 0
  const tickFast = startedAt !== undefined && elapsedMs < 10_000
  useEffect(() => {
    if (inline || startedAt === undefined) return
    const id = setInterval(() => setNow(Date.now()), tickFast ? 100 : 1000)
    return () => clearInterval(id)
  }, [inline, startedAt, tickFast])

  if (inline) {
    return <MolSpinner size={14} />
  }

  const generic = MESSAGES[msgIdx]
  const text =
    hasLabel && label ? label : t(generic.key, undefined, { defaultValue: generic.defaultValue })
  const elapsed = startedAt !== undefined ? formatElapsed(elapsedMs) : null

  return (
    <div
      role="status"
      aria-label={text}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 0',
        width: '100%',
        minWidth: 0,
      }}
    >
      <MolSpinner size={16} />
      <span
        style={{
          fontSize: '13px',
          opacity: 0.7,
          fontStyle: 'italic',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </span>
      {/* Status metrics pushed to the right edge; the spinner + label stay left.
          Token estimate + elapsed timer show how much work is happening and that
          it's still alive. Same size/color as the label; tabular-nums keeps the
          digits from jittering as they tick. A separator divides the two.

          This group is flexShrink:0, so every pixel it takes is one the activity
          label loses to an ellipsis — and labels are often long file paths, the
          most useful thing on the row. That rules out spelling the qualifier out
          inline: at 13px Arimo "~40.5k tokens" is 81px but "~40.5k output
          tokens" is 121px, a permanent 40px off the label's budget. So the
          visible unit stays plain and the TOOLTIP carries what the number
          actually is — output only, which is why it reads far below a provider
          dashboard. Keep any relabelling at or under the 81px baseline. */}
      {(elapsed || (tokens != null && tokens >= MIN_TOKENS_SHOWN)) && (
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '8px',
            fontSize: '13px',
            opacity: 0.7,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {tokens != null && tokens >= MIN_TOKENS_SHOWN && (
            <Tooltip
              content={t('ide.chat.streamingOutputTokensHint', undefined, {
                defaultValue: 'Estimated output tokens this turn — /cost shows input and cached.',
              })}
              placement="top"
            >
              <span>
                {t(
                  'ide.chat.streamingOutputTokens',
                  { count: formatTokens(tokens) },
                  { defaultValue: '~{{count}} tokens' },
                )}
              </span>
            </Tooltip>
          )}
          {tokens != null && tokens >= MIN_TOKENS_SHOWN && elapsed && <span>·</span>}
          {elapsed && <span>{elapsed}</span>}
        </span>
      )}
    </div>
  )
}

StreamingIndicator.displayName = 'StreamingIndicator'
