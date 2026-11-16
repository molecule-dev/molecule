/**
 * Types for the Angular political-bias / source-credibility indicator.
 *
 * @module
 */

/**
 * Reliability tier — drives the colour + label of the optional dot/chip.
 * Mapped from a 0..1 reliability score by `reliabilityToTier`.
 */
export type ReliabilityTier = 'high' | 'medium' | 'low' | 'disputed'

/**
 * Bias bucket — drives the bias-marker hue and the screen-reader label.
 * Derived from a -1..1 bias scalar by `biasToBucket`.
 */
export type BiasBucket = 'far-left' | 'left' | 'center' | 'right' | 'far-right'

/**
 * Props accepted by `BiasIndicator` — the same props
 * `@molecule/app-bias-indicator-react` accepts. React's node prop
 * (`sourceLabel`) is projected content in Angular (an input cannot carry a
 * node), so it is typed `unknown`: pass it in the host template as
 * `[slot=sourceLabel]` content, not as a value.
 */
export interface BiasIndicatorProps {
  /**
   * Bias scalar from `-1` (far left) through `0` (center) to `+1`
   * (far right). Values are clamped before rendering.
   */
  bias: number
  /**
   * Optional source-credibility / reliability score from `0` (lowest /
   * disputed) to `1` (highest). When omitted, no reliability indicator
   * is rendered.
   */
  reliability?: number
  /**
   * Compact variant collapses the scale to a single coloured dot —
   * useful for dense lists. Defaults to `false`.
   */
  compact?: boolean
  /**
   * Optional source name (e.g. `'Reuters'`). Renders as a small caption —
   * projected content selected by `[slot=sourceLabel]`.
   */
  sourceLabel?: unknown
  /** Extra classes to merge onto the root element. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}
