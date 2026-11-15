/**
 * Types for the Vue centered-label section divider.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link SectionDivider} component. */
export interface SectionDividerProps {
  /** Centered label text — the DEFAULT slot. Translate it upstream. */
  children?: VNodeChild
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}
