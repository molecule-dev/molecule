/**
 * Solid `SafeLink` router link — the counterpart of `@molecule/app-safe-link-react`'s
 * `SafeLink`: the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, splitProps } from 'solid-js'

import { Link, useLocation } from '@molecule/app-solid'

import type { SafeLinkProps } from './types.js'

/**
 * `<SafeLink>` renders the binding's `Link` (react-router `<Link>`'s click
 * rules), but if its destination matches the current path it appends a `#top`
 * fragment so clicking still produces an observable URL change.
 *
 * Avoids "dead-link" probes that return no URL/DOM mutation when a same-path
 * link is clicked — useful for nav primitives that get exercised by
 * behavioural verifiers / e2e probes.
 *
 * Every other attribute (`class` via `className`, `id`, `target`, `rel`,
 * `aria-*`, `data-*`, `onClick`) goes on the anchor, as with react-router's
 * `<Link>`.
 *
 * @param props - The link's {@link SafeLinkProps}; other attributes go on the anchor.
 * @returns The anchor.
 */
export const SafeLink: Component<SafeLinkProps> = (props) => {
  const location = useLocation()
  const [local, rest] = splitProps(props, ['to', 'replace', 'state', 'className', 'children'])

  /**
   * The destination with the same-path `#top` fragment applied.
   */
  const target = (): string => {
    const to = local.to
    const pathname = location().pathname
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  return (
    <Link
      to={target()}
      replace={local.replace}
      state={local.state}
      class={local.className}
      {...rest}
    >
      {local.children}
    </Link>
  )
}

export default SafeLink
