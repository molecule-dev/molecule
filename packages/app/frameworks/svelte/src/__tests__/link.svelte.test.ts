// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, mounted as a real Svelte
 * tree under `setMoleculeContext` carrying the router.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, unmount } from 'svelte'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { setMoleculeContext } from '../context.js'
import { Link } from '../link/index.js'

runLinkConformance('@molecule/app-svelte', async (container, router, props) => {
  // A reactive props object: changing `to` updates the same mounted link.
  const linkProps = $state<Record<string, unknown>>({
    to: props.to,
    replace: props.replace,
    state: props.state,
    onclick: props.onClick,
    ...props.attrs,
    children: createRawSnippet(() => ({ render: () => `<span>${props.text}</span>` })),
  })
  const app = mount(Host, {
    target: container,
    props: { config: { router }, setMoleculeContext, component: Link, props: linkProps },
  })
  flushSync()
  return {
    setTo: async (next) => {
      linkProps.to = next
      flushSync()
    },
    unmount: async () => {
      await unmount(app)
    },
  }
})
