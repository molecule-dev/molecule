import { getClassMap } from '@molecule/app-ui'

interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /** Accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence.
 * @param root0
 * @param root0.visible
 * @param root0.dotSize
 * @param root0.durationMs
 * @param root0.ariaLabel
 * @param root0.className
 */
export function TypingIndicator({
  visible = true,
  dotSize = 6,
  durationMs = 1200,
  ariaLabel = 'Typing…',
  className,
}: TypingIndicatorProps) {
  const cm = getClassMap()
  if (!visible) return null
  const keyName = 'molecule-typing-pulse'
  const css = `@keyframes ${keyName} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
    >
      <style>{css}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{
            display: 'inline-block',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: 'currentColor',
            animation: `${keyName} ${durationMs}ms ease-in-out infinite`,
            animationDelay: `${(i * durationMs) / 6}ms`,
          }}
        />
      ))}
    </span>
  )
}
