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
import { DEFAULT_TYPING_PULSE, getClassMap } from '@molecule/app-ui'

import type { TypingIndicatorProps } from './types.js'

/** The shared `@keyframes` rule the standard pulse curve animates with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/**
 * Three-dot "typing…" animation. CSS-only (no library dependency) —
 * uses `@keyframes` defined via inline style tag. Renders three dots
 * that pulse in sequence. The stylesheet also turns the pulse off under
 * `prefers-reduced-motion: reduce`, so the dots stay still for users who ask
 * for less motion (WCAG 2.3.3) instead of relying on a host stylesheet.
 *
 * The motion comes from the ClassMap's `typingPulse` recipe, read when the
 * component renders as React's `PulseDots` reads it, and falls back to
 * `DEFAULT_TYPING_PULSE`.
 *
 * @param props - Component props (see {@link TypingIndicatorProps}).
 * @returns The rendered typing indicator.
 */
export const TypingIndicator: Component<TypingIndicatorProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { peakAt, restAt, stagger, dimOpacity, dimScale } = cm.typingPulse ?? DEFAULT_TYPING_PULSE
  // Keyframes are document-wide. A custom curve must coexist with a mounted standard pulse.
  const keyName =
    peakAt === DEFAULT_TYPING_PULSE.peakAt &&
    restAt === DEFAULT_TYPING_PULSE.restAt &&
    dimOpacity === DEFAULT_TYPING_PULSE.dimOpacity &&
    dimScale === DEFAULT_TYPING_PULSE.dimScale
      ? KEYFRAMES_NAME
      : `${KEYFRAMES_NAME}-${[peakAt, restAt, dimOpacity, dimScale].join('-').replaceAll('.', '_')}`
  /** The stylesheet the indicator injects: the pulse and its reduced-motion opt-out. */
  const keyframesCss = `@keyframes ${keyName} { 0%, ${restAt * 100}%, 100% { opacity: ${dimOpacity}; transform: scale(${dimScale}); } ${peakAt * 100}% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`
  /** The label: the prop when given, else the translated default. */
  const label = (): string =>
    props.ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
  /**
   * One dot's animation shorthand.
   * @param index - The dot's position (0–2); each dot's delay staggers it.
   * @returns The `animation` value.
   */
  const animation = (index: number): string => {
    const durationMs = props.durationMs ?? 1200
    // The original division preserves the exact serialized delay for fractional values.
    const elapsed = index * durationMs
    const delay = stagger === DEFAULT_TYPING_PULSE.stagger ? elapsed / 6 : elapsed * stagger
    return `${keyName} ${durationMs}ms ease-in-out ${delay}ms infinite`
  }
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
                animation: animation(i),
              }}
            />
          )}
        </For>
      </span>
    </Show>
  )
}
