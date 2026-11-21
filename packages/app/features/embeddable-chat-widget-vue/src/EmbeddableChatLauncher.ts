/**
 * Floating circular launcher rendered in the corner of the host page.
 * Vue counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatLauncher` — the same props (React names), the same DOM.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { EmbeddableChatWidgetPosition, EmbeddableChatWidgetTheme } from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/** Props for {@link EmbeddableChatLauncher}. */
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
 * is resolved through a provider-optional translation composable that falls
 * back to English defaults when no provider is present.
 *
 * The React `onOpen` callback prop arrives as a Vue `open` event listener.
 */
export const EmbeddableChatLauncher = defineComponent({
  name: 'EmbeddableChatLauncher',
  props: {
    visible: { type: Boolean as PropType<boolean>, required: true },
    position: {
      type: String as PropType<EmbeddableChatWidgetPosition>,
      required: true,
    },
    theme: { type: Object as PropType<EmbeddableChatWidgetTheme>, default: undefined },
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  emits: ['open'],
  setup(props, { emit }) {
    const { t } = useSafeTranslation()

    return (): VNode | null => {
      if (!props.visible) return null

      const positionStyle: Record<string, string> =
        props.position === 'bottom-left'
          ? { left: '24px', bottom: '24px' }
          : { right: '24px', bottom: '24px' }

      const buttonStyle: Record<string, string | number> = {
        position: 'fixed',
        width: '56px',
        height: '56px',
        borderRadius: '9999px',
        border: 'none',
        cursor: 'pointer',
        zIndex: 2147483646,
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
        background: props.theme?.primaryColor ?? '#2563eb',
        color: props.theme?.primaryForegroundColor ?? '#ffffff',
        // Center the icon inline (not via ClassMap) so it works on a bare page
        // where no Tailwind/ClassMap classes are loaded.
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...positionStyle,
      }

      const ariaLabel = t(
        'embeddableChatWidget.launcher.openLabel',
        {},
        { defaultValue: 'Open chat' },
      )

      return h(
        'button',
        {
          type: 'button',
          onClick: (event: MouseEvent) => emit('open', event),
          'aria-label': ariaLabel,
          'data-mol-id': 'embeddable-chat-launcher',
          class: props.className,
          style: buttonStyle,
        },
        [
          // Inline SVG keeps the launcher self-contained — no font/icon dep.
          h(
            'svg',
            {
              'aria-hidden': 'true',
              width: '24',
              height: '24',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            },
            [
              h('path', {
                d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
              }),
            ],
          ),
        ],
      )
    }
  },
})
