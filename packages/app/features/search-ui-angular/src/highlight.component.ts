/**
 * Highlight component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { highlightMatches } from '@molecule/app-client-search'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HighlightProps } from './types.js'

/**
 * Highlight component.
 *
 * Text with the matched terms marked: each term is marked where it starts a
 * word, case-insensitively, through the ClassMap's `resultMark`. React's root
 * is a FRAGMENT (the segments, plain text and `<mark>` side by side), so the
 * host is unwrapped (`data-parity-unwrap`, `display: contents`) and renders
 * exactly React's node list. The text is an attribute of the element — pass
 * `text` and `terms` as inputs, not as content.
 */
@Component({
  selector: 'mol-highlight',
  standalone: true,
  inputs: ['text', 'terms'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@for (seg of segments(); track $index) {@if (seg.hit) {<mark [class]="cm().cn(cm().resultMark)">{{ seg.text }}</mark>} @else {{{ seg.text }}}}`,
})
export class Highlight implements HighlightProps {
  /** The text to show. */
  text = ''
  /** The matched terms to mark (a hit's `terms`). */
  terms: string[] = []

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The plain and matched segments, as React derives them per render.
   * @returns The segments, in order.
   */
  segments(): ReturnType<typeof highlightMatches> {
    return highlightMatches(this.text, this.terms)
  }
}
