/**
 * Solid three-dot typing indicator: a CSS-only pulse of three dots.
 *
 * Solid counterpart of `@molecule/app-typing-indicator-react`'s
 * `TypingIndicator` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TypingIndicatorProps } from './types.js'

/** The shared `@keyframes` rule the dots animate with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/** The stylesheet the indicator injects: the pulse and its reduced-motion opt-out. */
const keyframesCss = `@keyframes ${KEYFRAMES_NAME} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence. The stylesheet also turns the pulse off under
 * `prefers-reduced-motion: reduce`, so the dots stay still for users who ask
 * for less motion (WCAG 2.3.3) instead of relying on a host stylesheet.
 *
 * @param props - Component props (see {@link TypingIndicatorProps}).
 * @returns The rendered typing indicator.
 */
export const TypingIndicator: Component<TypingIndicatorProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  /** The label: the prop when given, else the translated default. */
  const label = (): string =>
    props.ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
  return (
    <Show when={props.visible ?? true}>
      <span
        role="status"
        aria-label={label()}
        class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}
      >
        <style>{keyframesCss}</style>
        <For each={[0, 1, 2]}>
          {(i) => (
            <span
              aria-hidden="true"
              data-typing-dot=""
              style={{
                display: 'inline-block',
                width: `${props.dotSize ?? 6}px`,
                height: `${props.dotSize ?? 6}px`,
                'border-radius': '50%',
                background: 'currentColor',
                animation: `${KEYFRAMES_NAME} ${props.durationMs ?? 1200}ms ease-in-out ${(i * (props.durationMs ?? 1200)) / 6}ms infinite`,
              }}
            />
          )}
        </For>
      </span>
    </Show>
  )
}
