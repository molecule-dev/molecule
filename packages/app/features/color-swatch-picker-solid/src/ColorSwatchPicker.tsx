/**
 * Solid color-swatch picker: a grid of colored circles with single-select
 * state.
 *
 * Solid counterpart of `@molecule/app-color-swatch-picker-react`'s
 * `ColorSwatchPicker` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input. Used for tag colors, label
 * colors, theme accent swatches, etc.
 *
 * @module
 */

import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ColorSwatchPickerProps } from './types.js'

/**
 * Grid of colored circles with single-select state. Each swatch renders as a
 * `role="radio"` button sized by `size` (default 28) and painted with its own
 * `color` — the one inline style that is the caller's data, not a design
 * token; a `cm.button()` fill would hide it. The style object uses kebab-case
 * keys because Solid's style runtime applies each key with `setProperty`,
 * which only reads kebab-case property names.
 *
 * @param props - Component props (see {@link ColorSwatchPickerProps}).
 * @returns The rendered swatch picker.
 */
export const ColorSwatchPicker: Component<ColorSwatchPickerProps> = (props) => {
  const cm = getClassMap()
  const size = (): string => `${props.size ?? 28}px`
  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      <div
        role="radiogroup"
        aria-label={props.ariaLabel}
        class={cm.flex({ align: 'center', gap: props.gap ?? 'sm', wrap: 'wrap' })}
      >
        <For each={props.swatches}>
          {(s) => {
            const selected = (): boolean => s.value === props.value
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected() ? 'true' : 'false'}
                aria-label={s.label ?? s.value}
                data-mol-id={`color-swatch-${s.value}`}
                data-selected={selected() ? 'true' : 'false'}
                onclick={() => props.onChange?.(s.value)}
                /* mol-bespoke-button: colour swatch, no label — the inline
                   background IS the caller's data (the colour being picked),
                   not a design token, and a `cm.button()` fill would hide it.
                   Cursor and the compact touch floor come from the ClassMap. */
                class={cm.cn(cm.roundedFull, cm.cursorPointer, cm.touchTargetCompact)}
                style={{
                  width: size(),
                  height: size(),
                  background: s.color,
                  outline: selected() ? '2px solid currentColor' : 'none',
                  'outline-offset': '2px',
                  border: 'none',
                }}
              />
            )
          }}
        </For>
      </div>
      {props.preview}
    </div>
  )
}
