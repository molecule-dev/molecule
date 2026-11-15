/**
 * Types of `@molecule/app-color-swatch-picker-angular` — the Angular
 * counterpart of `@molecule/app-color-swatch-picker-react`, same props and
 * same DOM.
 *
 * @module
 */

/** A single color option in the swatch picker with its value, CSS color, and optional label. */
export interface ColorSwatch {
  /** Value stored in state (can be the raw color or a semantic id). */
  value: string
  /** CSS color (any valid color string). */
  color: string
  /** Optional label shown as tooltip / aria-label. */
  label?: string
}

/**
 * Props accepted by {@link ColorSwatchPicker} — the same props
 * `@molecule/app-color-swatch-picker-react` accepts. The node prop
 * (`preview`) is projected content in Angular (an input cannot carry a
 * node), so it is typed `unknown`: pass it in the host template, not as a
 * value.
 */
export interface ColorSwatchPickerProps {
  /** Swatch definitions. */
  swatches: ColorSwatch[]
  /** Currently selected swatch value. */
  value: string
  /** Called when a swatch is picked. */
  onChange: (value: string) => void
  /** Swatch diameter in pixels. Defaults to 28. */
  size?: number
  /** Gap between swatches. */
  gap?: 'xs' | 'sm' | 'md'
  /** Optional child rendered below (e.g. a live preview), projected as `[slot=preview]` content. */
  preview?: unknown
  /** Extra classes. */
  className?: string
  /** `aria-label` for the group. */
  ariaLabel?: string
}
