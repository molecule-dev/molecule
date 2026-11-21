import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Props for the {@link TypingIndicator} component. */
export interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /**
   * Accessible label. Overrides the translated / `defaultValue` `'Typing…'`
   * (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence. The stylesheet also turns the pulse off under
 * `prefers-reduced-motion: reduce`, so the dots stay still for users who ask
 * for less motion (WCAG 2.3.3) instead of relying on a host stylesheet.
 * @param props - Component props (see {@link TypingIndicatorProps}).
 */
export function TypingIndicator({
  visible = true,
  dotSize = 6,
  durationMs = 1200,
  ariaLabel,
  className,
}: TypingIndicatorProps): JSX.Element | null {
  const { t } = useTranslation()
  const cm = getClassMap()
  if (!visible) return null
  const label = ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
  const keyName = 'molecule-typing-pulse'
  // The pulse honours `prefers-reduced-motion` in the component's own
  // stylesheet: the host stylesheet's global 0.01ms collapse still leaves the
  // per-dot stagger delay, so the dots flash in sequence for a reduced-motion
  // user and the rendered frame depends on when it is painted.
  const css = `@keyframes ${keyName} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`
  return (
    <span
      role="status"
      aria-label={label}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
    >
      <style>{css}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          data-typing-dot=""
          style={{
            display: 'inline-block',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: 'currentColor',
            // One shorthand carries the stagger: mixing it with an `animationDelay`
            // longhand makes React warn when `durationMs` changes.
            animation: `${keyName} ${durationMs}ms ease-in-out ${(i * durationMs) / 6}ms infinite`,
          }}
        />
      ))}
    </span>
  )
}
