/**
 * Vue three-dot typing indicator: a CSS-only pulse of three dots.
 *
 * Vue counterpart of `@molecule/app-typing-indicator-react`'s `TypingIndicator`
 * — the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/** The shared `@keyframes` rule the dots animate with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence. The stylesheet also turns the pulse off under
 * `prefers-reduced-motion: reduce`, so the dots stay still for users who ask
 * for less motion (WCAG 2.3.3) instead of relying on a host stylesheet.
 *
 * @param props - Component props (see {@link TypingIndicatorProps}).
 * @returns The typing indicator component.
 */
export const TypingIndicator = defineComponent({
  name: 'TypingIndicator',
  props: {
    visible: { type: Boolean as PropType<boolean>, default: true },
    dotSize: { type: Number as PropType<number>, default: 6 },
    durationMs: { type: Number as PropType<number>, default: 1200 },
    ariaLabel: { type: String as PropType<string | undefined> },
    className: String as PropType<string | undefined>,
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()

    return (): VNode | null => {
      if (!props.visible) return null
      const label =
        props.ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
      // The pulse honours `prefers-reduced-motion` in the component's own
      // stylesheet: the host stylesheet's global 0.01ms collapse still leaves
      // the per-dot stagger delay, so the dots flash in sequence for a
      // reduced-motion user and the rendered frame depends on when it is painted.
      const css = `@keyframes ${KEYFRAMES_NAME} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`
      return h(
        'span',
        {
          role: 'status',
          'aria-label': label,
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
        },
        [
          h('style', css),
          ...[0, 1, 2].map((i) =>
            h('span', {
              'aria-hidden': 'true',
              'data-typing-dot': '',
              style: {
                display: 'inline-block',
                width: `${props.dotSize}px`,
                height: `${props.dotSize}px`,
                'border-radius': '50%',
                background: 'currentColor',
                animation: `${KEYFRAMES_NAME} ${props.durationMs}ms ease-in-out ${(i * props.durationMs) / 6}ms infinite`,
              },
            }),
          ),
        ],
      )
    }
  },
})
