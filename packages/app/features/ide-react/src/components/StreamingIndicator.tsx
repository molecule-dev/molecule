/**
 * Streaming indicator — animated molecule spinner with rotating status
 * messages. Replaces the blinking block cursor during AI response streaming.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'

// ---------------------------------------------------------------------------
// Molecule spinner — inline SVG (3-phase atom-swapping animation)
// ---------------------------------------------------------------------------

const DUR = '1.5s'
const EASE = '0.42 0 0.58 1'
const LIN = '0 0 1 1'

/**
 * Animated molecule logo spinner (pure SVG, no external deps).
 * @param root0
 * @param root0.size
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
          attributeName="transform" type="rotate"
          from="0 16 16" to="360 16 16"
          dur="3s" repeatCount="indefinite"
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
              attributeName="opacity" dur={DUR} repeatCount="indefinite"
              values="1;0;0;1;1"
              keyTimes="0;0.033;0.167;0.217;1"
              calcMode="spline"
              keySplines={[EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Bond: Center–Bottom-right */}
          <line x1="20.959" x2="24.924" y1="18.579" y2="25.446">
            <animate
              attributeName="opacity" dur={DUR} repeatCount="indefinite"
              values="1;1;0;0;1;1"
              keyTimes="0;0.333;0.367;0.500;0.550;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Bond: Center–Top-right */}
          <line x1="20.959" x2="24.924" y1="13.422" y2="6.555">
            <animate
              attributeName="opacity" dur={DUR} repeatCount="indefinite"
              values="1;1;0;0;1;1"
              keyTimes="0;0.667;0.700;0.833;0.883;1"
              calcMode="spline"
              keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </line>

          {/* Atom 0: Center → Left */}
          <circle cx="19.47" cy="16" r="2.976">
            <animate
              attributeName="cx" dur={DUR} repeatCount="indefinite"
              values="19.47;19.47;5.587;5.587"
              keyTimes="0;0.033;0.167;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 1: Left → Center → Bottom-right */}
          <circle cx="5.587" cy="16" r="2.976">
            <animate
              attributeName="cx" dur={DUR} repeatCount="indefinite"
              values="5.587;5.587;19.47;19.47;26.412;26.412"
              keyTimes="0;0.033;0.167;0.367;0.500;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy" dur={DUR} repeatCount="indefinite"
              values="16;16;16;16;28.023;28.023"
              keyTimes="0;0.033;0.167;0.367;0.500;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 2: Bottom-right → Center → Top-right */}
          <circle cx="26.412" cy="28.023" r="2.976">
            <animate
              attributeName="cx" dur={DUR} repeatCount="indefinite"
              values="26.412;26.412;19.47;19.47;26.412;26.412"
              keyTimes="0;0.367;0.500;0.700;0.833;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy" dur={DUR} repeatCount="indefinite"
              values="28.023;28.023;16;16;3.977;3.977"
              keyTimes="0;0.367;0.500;0.700;0.833;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN, EASE, LIN].join(';')}
            />
          </circle>

          {/* Atom 3: Top-right → Center */}
          <circle cx="26.412" cy="3.977" r="2.976">
            <animate
              attributeName="cx" dur={DUR} repeatCount="indefinite"
              values="26.412;26.412;19.47;19.47"
              keyTimes="0;0.700;0.833;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN].join(';')}
            />
            <animate
              attributeName="cy" dur={DUR} repeatCount="indefinite"
              values="3.977;3.977;16;16"
              keyTimes="0;0.700;0.833;1"
              calcMode="spline" keySplines={[LIN, EASE, LIN].join(';')}
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

const MESSAGES: ReadonlyArray<{ key: string; defaultValue: string }> = [
  { key: 'ide.chat.streaming.thinking', defaultValue: 'Thinking...' },
  { key: 'ide.chat.streaming.analyzing', defaultValue: 'Analyzing...' },
  { key: 'ide.chat.streaming.reasoning', defaultValue: 'Reasoning...' },
  { key: 'ide.chat.streaming.crafting', defaultValue: 'Crafting a response...' },
  { key: 'ide.chat.streaming.working', defaultValue: 'Working on it...' },
  { key: 'ide.chat.streaming.processing', defaultValue: 'Processing...' },
  { key: 'ide.chat.streaming.connecting', defaultValue: 'Connecting the dots...' },
  { key: 'ide.chat.streaming.almostThere', defaultValue: 'Almost there...' },
]

const ROTATE_INTERVAL_MS = 3000

// ---------------------------------------------------------------------------
// StreamingIndicator
// ---------------------------------------------------------------------------

interface StreamingIndicatorProps {
  /** When true, renders only the spinner inline (no message text). */
  inline?: boolean
}

/**
 * Animated streaming indicator with molecule spinner and rotating
 * status messages. Pass `inline` for a compact cursor replacement
 * inside flowing text.
 * @param root0
 * @param root0.inline
 */
export function StreamingIndicator({ inline }: StreamingIndicatorProps): JSX.Element {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    if (inline) return
    const id = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [inline])

  if (inline) {
    return <MolSpinner size={14} />
  }

  const { key, defaultValue } = MESSAGES[msgIdx]

  return (
    <div
      role="status"
      aria-label={t(key, undefined, { defaultValue })}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}
    >
      <MolSpinner size={16} />
      <span style={{ fontSize: '13px', opacity: 0.7, fontStyle: 'italic' }}>
        {t(key, undefined, { defaultValue })}
      </span>
    </div>
  )
}

StreamingIndicator.displayName = 'StreamingIndicator'
