import type { CSSProperties, JSX } from 'react'

import type { EmbeddableChatWidgetPosition, EmbeddableChatWidgetTheme } from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

export interface EmbeddableChatLauncherProps {
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
 * Fully self-contained: positioning, sizing, color, and flex centering are
 * all inline styles, so the launcher renders correctly even when the host
 * page has NOT loaded the molecule stylesheet / wired a ClassMap bond. Text
 * is resolved through a provider-optional translation hook that falls back
 * to English defaults when no `I18nProvider` is present.
 *
 * @param props - Component props (see {@link EmbeddableChatLauncherProps}).
 */
export function EmbeddableChatLauncher({
  visible,
  onOpen,
  position,
  theme,
  className,
}: EmbeddableChatLauncherProps): JSX.Element | null {
  const { t } = useSafeTranslation()
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
    // Center the icon inline (not via ClassMap) so it works on a bare page
    // where no Tailwind/ClassMap classes are loaded.
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...positionStyle,
  }

  const ariaLabel = t('embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' })

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      data-mol-id="embeddable-chat-launcher"
      className={className}
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
