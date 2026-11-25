// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, rendered as a real Solid
 * tree inside `MoleculeProvider` carrying the router, or with no router for a
 * case that mounts none.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { Link } from '../link.jsx'
import { MoleculeProvider } from '../provider.jsx'

runLinkConformance(
  '@molecule/app-solid',
  async (container, router, props) => {
    const [to, setTo] = createSignal(props.to)
    const dispose = render(
      () => (
        // The provider without a router when none is mounted: an app with no router mounts it the same way.
        <MoleculeProvider router={router ?? undefined}>
          <Link
            to={to()}
            replace={props.replace}
            state={props.state}
            onClick={props.onClick}
            ref={(anchor) => props.ref?.(anchor)}
            {...props.attrs}
          >
            {props.text}
          </Link>
        </MoleculeProvider>
      ),
      container,
    )
    return {
      setTo: async (next) => {
        setTo(next)
      },
      unmount: async () => dispose(),
    }
  },
  'solid.error.useRouterOutsideProvider',
)
