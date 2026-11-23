/**
 * The translated footnote labels this bond hands to `remark-rehype`, read
 * through `t()` at render time so they follow the active locale.
 *
 * They live outside the `.tsx` provider because React components read
 * translations through the hook from `@molecule/app-react`; this module runs
 * while the static HTML string is built, not while a component renders.
 *
 * @module
 */

import type { Options } from 'react-markdown'

import { t } from '@molecule/app-i18n'

/**
 * The footnotes-section label shown as the section's accessible name.
 *
 * @returns The translated label.
 */
export function footnoteSectionLabel(): string {
  return t('markdown.footnotes.label', undefined, { defaultValue: 'Footnotes' })
}

/**
 * Builds the `remark-rehype` options that shape GFM footnotes: no clobber
 * prefix (`fn-1`, `fnref-1`), the section label, and each back link's label
 * from `t()` (`Back to reference n`, `Back to reference n-2` for a repeat).
 *
 * @param label - The translated footnotes-section label.
 * @returns The `remarkRehypeOptions` for react-markdown.
 */
export function buildRemarkRehypeOptions(
  label: string,
): NonNullable<Options['remarkRehypeOptions']> {
  return {
    clobberPrefix: '',
    footnoteLabel: label,
    footnoteBackLabel: (referenceIndex: number, rereferenceIndex: number): string => {
      const reference = `${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ''}`
      return t(
        'markdown.footnotes.backToReference',
        { reference },
        { defaultValue: 'Back to reference {{reference}}' },
      )
    },
  }
}
