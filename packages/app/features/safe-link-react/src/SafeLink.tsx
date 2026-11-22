import type { JSX } from 'react'

import { useLocation } from '@molecule/app-react'
import { Link } from '@molecule/app-react/link'

import type { SafeLinkProps } from './types.js'

/**
 * `<SafeLink>` renders a `Link` from `@molecule/app-react/link`, but if its destination
 * matches the current path it appends a `#top` fragment so clicking
 * still produces an observable URL change.
 *
 * Avoids "dead-link" probes that return no URL/DOM mutation when a
 * same-path link is clicked — useful for nav primitives that get
 * exercised by behavioural verifiers / e2e probes.
 */
export function SafeLink({ to, children, ...rest }: SafeLinkProps): JSX.Element {
  const location = useLocation()
  const samePath = location.pathname === to || location.pathname + '/' === to
  const target = samePath ? `${to.replace(/\/$/, '')}#top` : to
  return (
    <Link to={target} {...rest}>
      {children}
    </Link>
  )
}

export default SafeLink
