// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, rendered as a real React
 * tree inside `MoleculeProvider` carrying the router, or with no router for a
 * case that mounts none.
 *
 * @module
 */

import type { AnchorHTMLAttributes } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { Link } from '../link.js'
import { MoleculeProvider } from '../providers.js'

// react-dom tells act() whether it runs inside a test through this global.
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  configurable: true,
})

/**
 * The anchor's props from the kit's HTML-spelled attributes. React spells the
 * `class` attribute `className`; every other attribute keeps its name.
 *
 * @param attrs - Attributes the case asks the anchor to carry.
 * @returns Props for the rendered anchor.
 */
const reactAttributes = (
  attrs: Record<string, string> | undefined,
): AnchorHTMLAttributes<HTMLAnchorElement> => {
  const { class: className, ...rest } = attrs ?? {}
  const attributes: AnchorHTMLAttributes<HTMLAnchorElement> = {}
  Object.assign(attributes, rest)
  if (className !== undefined) attributes.className = className
  return attributes
}

runLinkConformance(
  '@molecule/app-react',
  async (container, router, props) => {
    const root = createRoot(container)
    const attributes = reactAttributes(props.attrs)
    const render = (to: string): void => {
      root.render(
        // With no router mounted, the provider itself stays: an app with no router mounts it the same way.
        <MoleculeProvider router={router ?? undefined}>
          <Link
            to={to}
            replace={props.replace}
            state={props.state}
            onClick={(event) => props.onClick?.(event.nativeEvent)}
            ref={props.ref}
            {...attributes}
          >
            {props.text}
          </Link>
        </MoleculeProvider>,
      )
    }
    try {
      await act(async () => render(props.to))
    } catch (error) {
      // A render that threw left nothing to unmount, but the root must not outlive the case.
      await act(async () => root.unmount())
      throw error
    }
    return {
      setTo: async (next) => {
        await act(async () => render(next))
      },
      unmount: async () => {
        await act(async () => root.unmount())
      },
    }
  },
  'react.error.useRouterOutsideProvider',
)
