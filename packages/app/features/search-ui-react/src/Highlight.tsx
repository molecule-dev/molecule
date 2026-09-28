import { Fragment } from 'react'

import { highlightMatches } from '@molecule/app-client-search'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link Highlight}. */
export interface HighlightProps {
  /** The text to show. */
  text: string
  /** The matched terms to mark (a hit's `terms`). */
  terms: string[]
}

/**
 * Text with the matched terms marked: each term is marked where it starts a
 * word, case-insensitively, through the ClassMap's `resultMark`.
 *
 * @param props - The text and the terms.
 * @returns The text with `<mark>` around each match.
 */
export function Highlight({ text, terms }: HighlightProps): React.JSX.Element {
  const cm = getClassMap()
  return (
    <>
      {highlightMatches(text, terms).map((seg, i) =>
        seg.hit ? (
          <mark key={i} className={cm.resultMark}>
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  )
}
