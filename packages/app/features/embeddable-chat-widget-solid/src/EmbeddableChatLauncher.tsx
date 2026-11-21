/**
 * Floating circular launcher rendered in the corner of the host page.
 * Solid counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatLauncher` — the same props (React names), the same DOM.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import type { EmbeddableChatWidgetPosition, EmbeddableChatWidgetTheme } from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/**
 * The launcher button's inline style. Every style object in this package is
 * built by a function so Solid applies it at runtime (per-property
 * `setProperty`), where the DOM parses and normalizes each value exactly as
 * React's inline-style object does — a static object would be baked into the
 * template attribute verbatim and read unnormalized.
 *
 * @param theme - The optional widget theme.
 * @param position - The floating corner.
 * @returns The style declarations.
 */
const buttonStyle = (
  theme: EmbeddableChatWidgetTheme | undefined,
  position: EmbeddableChatWidgetPosition,
): Record<string, string> => ({
  position: 'fixed',
  width: '56px',
  height: '56px',
  'border-radius': '9999px',
  border: 'none',
  cursor: 'pointer',
  'z-index': '2147483646',
  'box-shadow': '0 6px 18px rgba(0, 0, 0, 0.18)',
  background: theme?.primaryColor ?? '#2563eb',
  color: theme?.primaryForegroundColor ?? '#ffffff',
  // Center the icon inline (not via ClassMap) so it works on a bare page
  // where no Tailwind/ClassMap classes are loaded.
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  ...(position === 'bottom-left'
    ? { left: '24px', bottom: '24px' }
    : { right: '24px', bottom: '24px' }),
})

/** Props for {@link EmbeddableChatLauncher}. */
export interface EmbeddableChatLauncherProps {
  /** Whether the launcher should render. Hidden while the panel is expanded. */
  visible: boolean
  /** Click handler — flips the widget into expanded state. */
  onOpen: (event: MouseEvent) => void
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
 * is resolved through a provider-optional translation primitive that falls
 * back to English defaults when no provider is present.
 */
export const EmbeddableChatLauncher: Component<EmbeddableChatLauncherProps> = (props) => {
  const { t } = useSafeTranslation()
  const ariaLabel = (): string =>
    t('embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' })

  return (
    <Show when={props.visible}>
      <button
        type="button"
        onClick={(event) => props.onOpen(event)}
        aria-label={ariaLabel()}
        data-mol-id="embeddable-chat-launcher"
        class={props.className}
        style={buttonStyle(props.theme, props.position)}
      >
        {/* Inline SVG keeps the launcher self-contained — no font/icon dep. */}
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </Show>
  )
}
