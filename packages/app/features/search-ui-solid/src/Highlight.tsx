/**
 * Solid marked text — the counterpart of `@molecule/app-search-ui-react`'s
 * `Highlight`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { highlightMatches } from '@molecule/app-client-search'
import { getClassMap } from '@molecule/app-ui'

import type { HighlightProps } from './types.js'

/**
 * Text with the matched terms marked: each term is marked where it starts a
 * word, case-insensitively, through the ClassMap's `resultMark`.
 *
 * @param props - See {@link HighlightProps}.
 * @returns The text with `<mark>` around each match.
 */
export const Highlight = (props: HighlightProps): JSX.Element => {
  const cm = getClassMap()
  return (
    <>
      {highlightMatches(props.text, props.terms).map((seg) =>
        seg.hit ? <mark class={cm.resultMark}>{seg.text}</mark> : seg.text,
      )}
    </>
  )
}
