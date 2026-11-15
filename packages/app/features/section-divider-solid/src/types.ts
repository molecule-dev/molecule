import type { JSX } from 'solid-js'

/** Props accepted by the {@link SectionDivider} component. */
export interface SectionDividerProps {
  /** Centered label text. Translate it upstream. */
  children?: JSX.Element
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}
