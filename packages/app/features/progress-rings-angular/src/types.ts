/**
 * Types of `@molecule/app-progress-rings-angular` — the Angular counterpart of
 * `@molecule/app-progress-rings-react`, same props and DOM.
 *
 * @module
 */

/** Single ring entry — value/max plus the colored accent and an optional label. */
export interface ProgressRing {
  /** Current progress value. Clamped against `max` at render time. */
  value: number
  /** Maximum / goal value. Must be > 0; values <= 0 fall back to 1. */
  max: number
  /**
   * SVG stroke color for this ring. Pass a CSS color (token-resolved by the
   * caller against the active theme) — the component never hardcodes color.
   */
  color: string
  /** Optional accessible label for this ring (e.g. "Steps", "Sleep"). */
  label?: string
}

/** Props accepted by {@link ProgressRings} — the same props the React package accepts, bound as inputs. */
export interface ProgressRingsProps {
  /** One or more rings. 1 ring = single circle; 2+ = concentric Apple-Health-style stack. */
  rings: ProgressRing[]
  /** Outer SVG diameter in px. Defaults to 160. */
  size?: number
  /** Stroke thickness for each ring in px. Defaults to 12. */
  strokeWidth?: number
  /** Gap between concentric rings in px (ignored when only one ring). Defaults to 4. */
  gap?: number
  /**
   * Stroke linecap rounding. `'round'` produces the iOS-Health pill caps;
   * `'butt'` is flat. Defaults to `'round'`.
   */
  cornerRadius?: 'round' | 'butt'
  /** Override the outer wrapper classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Optional aria-label for the whole graphic. Falls back to translated summary. */
  ariaLabel?: string
}
