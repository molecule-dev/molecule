// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, mounted as a real Svelte
 * tree under `setMoleculeContext` carrying the router.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, unmount } from 'svelte'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import type { LinkProps } from '../link/index.js'
import LinkHost from './LinkHost.svelte'

runLinkConformance('@molecule/app-svelte', async (container, router, props) => {
  // A reactive props object: changing `to` updates the same mounted link.
  const link = $state<LinkProps>({
    to: props.to,
    replace: props.replace,
    state: props.state,
    onclick: props.onClick,
    ...props.attrs,
    children: createRawSnippet(() => ({ render: () => `<span>${props.text}</span>` })),
  })
  const app = mount(LinkHost, {
    target: container,
    props: { config: { router }, link, onanchor: props.ref },
  })
  flushSync()
  return {
    setTo: async (next) => {
      link.to = next
      flushSync()
    },
    unmount: async () => {
      await unmount(app)
    },
  }
})
