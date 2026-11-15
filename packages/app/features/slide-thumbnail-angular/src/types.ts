/**
 * Types of `@molecule/app-slide-thumbnail-angular` — the Angular counterpart
 * of `@molecule/app-slide-thumbnail-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link SlideThumbnail} — the same props
 * `@molecule/app-slide-thumbnail-react` accepts. Node props (`children`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
 */
export interface SlideThumbnailProps {
  /** Slide index (1-based). */
  index: number
  /** Live preview content, projected as the element's default content. */
  children?: unknown
  /** Whether the thumbnail represents the active slide. */
  active?: boolean
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: (event: MouseEvent) => void
  /** Optional aspect ratio (defaults to 16/9). */
  aspect?: '16/9' | '4/3' | '1/1'
  /** Width in pixels. Defaults to 160. */
  width?: number
  /** Extra classes. */
  className?: string
}
