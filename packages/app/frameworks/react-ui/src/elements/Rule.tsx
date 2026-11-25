/**
 * Rule: a horizontal thematic break.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement } from 'react'

import type { ElementHandle, RuleProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'

/** Renders the literal void element with the supplied attributes and styles. */
export const Rule = forwardRef<ElementHandle, RuleProps>(function Rule(
  { as, children: _children, ...props },
  ref,
): ReactElement {
  return createElement(as, {
    ...webElementAttributes(props),
    ref: useElementRef<HTMLHRElement>(ref),
  })
})
