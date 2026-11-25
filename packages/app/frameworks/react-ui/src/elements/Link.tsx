/**
 * Link: an in-app or external link.
 *
 * @module
 */

import type { ReactElement } from 'react'

import { Link as RouterLink } from '@molecule/app-react/link'
import type { ElementLinkProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A link: renders exactly the `<a>` of `@molecule/app-react/link`, which navigates in-app through
 * the router for an app path. On React Native it is a `Pressable` with the link role.
 *
 * @param props - See {@link ElementLinkProps}.
 * @returns The element.
 */
export function Link({
  children,
  ref,
  ...props
}: ElementLinkProps<ElementNode> & ElementRefProps): ReactElement {
  return (
    <RouterLink {...webElementAttributes(props)} ref={useElementRef<HTMLAnchorElement>(ref)}>
      {children}
    </RouterLink>
  )
}
