/**
 * PulseDots: decorative typing activity paint.
 *
 * @module
 */

import type { ReactElement } from 'react'

import { DEFAULT_TYPING_PULSE, getClassMap, type PulseDotsProps } from '@molecule/app-ui'

const STANDARD_KEYFRAMES = 'molecule-typing-pulse'

/**
 * Draws three dots in the surrounding text colour. The caller supplies layout and status semantics.
 *
 * @param props - See {@link PulseDotsProps}.
 * @returns The inline motion stylesheet followed by three decorative spans.
 */
export function PulseDots({ size, durationMs }: PulseDotsProps): ReactElement {
  const { peakAt, restAt, stagger, dimOpacity, dimScale } =
    getClassMap().typingPulse ?? DEFAULT_TYPING_PULSE
  // Keyframes are document-wide. A custom curve must coexist with a mounted standard pulse.
  const keyName =
    peakAt === DEFAULT_TYPING_PULSE.peakAt &&
    restAt === DEFAULT_TYPING_PULSE.restAt &&
    dimOpacity === DEFAULT_TYPING_PULSE.dimOpacity &&
    dimScale === DEFAULT_TYPING_PULSE.dimScale
      ? STANDARD_KEYFRAMES
      : `${STANDARD_KEYFRAMES}-${[peakAt, restAt, dimOpacity, dimScale].join('-').replaceAll('.', '_')}`
  // Disabling the animation also removes the stagger delays under reduced motion.
  const css = `@keyframes ${keyName} { 0%, ${restAt * 100}%, 100% { opacity: ${dimOpacity}; transform: scale(${dimScale}); } ${peakAt * 100}% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`

  return (
    <>
      <style>{css}</style>
      {[0, 1, 2].map((index) => {
        // The original division preserves the exact serialized delay for fractional values.
        const elapsed = index * durationMs
        const delay = stagger === DEFAULT_TYPING_PULSE.stagger ? elapsed / 6 : elapsed * stagger
        return (
          <span
            key={index}
            aria-hidden
            data-typing-dot=""
            style={{
              display: 'inline-block',
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'currentColor',
              // Updating a single shorthand keeps duration and delay in sync.
              animation: `${keyName} ${durationMs}ms ease-in-out ${delay}ms infinite`,
            }}
          />
        )
      })}
    </>
  )
}
