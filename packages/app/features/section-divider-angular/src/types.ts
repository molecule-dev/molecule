/**
 * Types of `@molecule/app-section-divider-angular` — the Angular counterpart
 * of `@molecule/app-section-divider-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link SectionDivider} — the same props
 * `@molecule/app-section-divider-react` accepts. The label is projected
 * content in Angular (an input cannot carry a node), so `children` is typed
 * `unknown`: pass it in the host template, not as a value.
 */
export interface SectionDividerProps {
  /** Centered label text, projected as the element's default content. */
  children?: unknown
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}
