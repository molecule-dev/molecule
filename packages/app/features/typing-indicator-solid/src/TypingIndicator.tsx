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

import { getClassMap } from '@molecule/app-ui'

import type { TypingIndicatorProps } from './types.js'

/** The shared `@keyframes` rule the dots animate with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/** The injected `@keyframes` rule, written once per indicator. */
const keyframesCss = `@keyframes ${KEYFRAMES_NAME} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence.
 *
 * @param props - Component props (see {@link TypingIndicatorProps}).
 * @returns The rendered typing indicator.
 */
export const TypingIndicator: Component<TypingIndicatorProps> = (props) => {
  const cm = getClassMap()
  return (
    <Show when={props.visible ?? true}>
      <span
        role="status"
        aria-label={props.ariaLabel ?? 'Typing…'}
        class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}
      >
        <style>{keyframesCss}</style>
        <For each={[0, 1, 2]}>
          {(i) => (
            <span
              aria-hidden="true"
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
