import type { CSSProperties, JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EmbeddableChatWidgetPosition, EmbeddableChatWidgetTheme } from './types.js'

interface EmbeddableChatLauncherProps {
  /** Whether the launcher should render. Hidden while the panel is expanded. */
  visible: boolean
  /** Click handler — flips the widget into expanded state. */
  onOpen: () => void
  /** Floating position (`bottom-right` | `bottom-left`). */
  position: EmbeddableChatWidgetPosition
  /** Optional theme. */
  theme?: EmbeddableChatWidgetTheme
  /** Extra classes. */
  className?: string
}

/**
 * Floating circular launcher rendered in the corner of the host page.
 * Click expands the chat panel.
 *
 * Uses inline-style positioning + sizing because the host page might
 * not load the molecule stylesheet — this component is intentionally
 * self-sufficient for color and geometry. ClassMap is still used for
 * layout primitives that don't conflict with host CSS.
 *
 * @param root0 Component props.
 * @param root0.visible Whether to render.
 * @param root0.onOpen Open-panel callback.
 * @param root0.position Floating corner.
 * @param root0.theme Optional theme.
 * @param root0.className Extra classes.
 */
export function EmbeddableChatLauncher({
  visible,
  onOpen,
  position,
  theme,
  className,
}: EmbeddableChatLauncherProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (!visible) return null

  const positionStyle: CSSProperties =
    position === 'bottom-left'
      ? { left: '24px', bottom: '24px' }
      : { right: '24px', bottom: '24px' }

  const buttonStyle: CSSProperties = {
    position: 'fixed',
    width: '56px',
    height: '56px',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    zIndex: 2147483646,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
    background: theme?.primaryColor ?? '#2563eb',
    color: theme?.primaryForegroundColor ?? '#ffffff',
    ...positionStyle,
  }

  const ariaLabel = t('embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' })

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      data-mol-id="embeddable-chat-launcher"
      className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), className)}
      style={buttonStyle}
    >
      {/* Inline SVG keeps the launcher self-contained — no font/icon dep. */}
      <svg
        aria-hidden
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
