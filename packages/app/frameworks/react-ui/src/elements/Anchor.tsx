/**
 * Anchor: a link with a literal href.
 *
 * @module
 */

import { forwardRef } from 'react'

import type { AnchorProps, ElementHandle } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode } from './types.js'

/**
 * Renders a literal `<a href>` with the supplied props. The browser handles navigation after the
 * caller's click handler, including cancellation through `preventDefault()`.
 */
export const Anchor = forwardRef<ElementHandle, AnchorProps<ElementNode>>(function Anchor(
  { style, webStyle, children, ...props },
  ref,
) {
  return (
    <a
      {...props}
      ref={useElementRef<HTMLAnchorElement>(ref)}
      style={webElementStyle(style, webStyle)}
    >
      {children}
    </a>
  )
})
