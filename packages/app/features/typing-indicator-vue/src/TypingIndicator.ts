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

/** The shared `@keyframes` rule the dots animate with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence.
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
    ariaLabel: { type: String as PropType<string>, default: 'Typing…' },
    className: String as PropType<string | undefined>,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode | null => {
      if (!props.visible) return null
      const css = `@keyframes ${KEYFRAMES_NAME} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`
      return h(
        'span',
        {
          role: 'status',
          'aria-label': props.ariaLabel,
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
        },
        [
          h('style', css),
          ...[0, 1, 2].map((i) =>
            h('span', {
              'aria-hidden': 'true',
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
