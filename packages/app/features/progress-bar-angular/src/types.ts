/**
 * Types of `@molecule/app-progress-bar-angular` — the Angular counterpart of
 * `@molecule/app-progress-bar-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link ProgressBar} — the same props
 * `@molecule/app-progress-bar-react` accepts. Node props (`label`,
 * `valueLabel`) are typed `unknown`: pass a plain string as the input, or
 * project content as `[slot=<name>]` children of the host element.
 */
export interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track — a string input, or `[slot=label]` content. */
  label?: unknown
  /** Optional value display on the right of the label row — a string input, or `[slot=valueLabel]` content. */
  valueLabel?: unknown
  /**
   * Element id the track is named by (`aria-labelledby`). Wins over `label`
   * and the default accessible name — `ProgressCard` points it at its title.
   */
  labelledBy?: string
  /** Element id the track is described by (`aria-describedby`). */
  describedBy?: string
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Props accepted by {@link ProgressCard} — the same props
 * `@molecule/app-progress-bar-react` accepts. Node props (`title`,
 * `description`, `icon`, `valueLabel`, `children`) are typed `unknown`: pass a
 * plain string as the input, or project content as `[slot=<name>]` children of
 * the host element.
 */
export interface ProgressCardProps {
  /** Card title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional supporting description below the title — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Optional icon shown in the card header — `[slot=icon]` projected content (or a string input). */
  icon?: unknown
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header — a string input, or `[slot=valueLabel]` content. */
  valueLabel?: unknown
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar, projected as the element's default content. */
  children?: unknown
}
