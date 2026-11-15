import type { Snippet } from 'svelte'

/** Props accepted by the {@link SectionDivider} component. */
export interface SectionDividerProps {
  /** Centered label text — the `children` snippet. Translate it upstream. */
  children?: Snippet
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}
