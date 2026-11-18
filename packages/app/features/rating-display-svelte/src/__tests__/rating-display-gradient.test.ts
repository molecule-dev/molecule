// @vitest-environment jsdom
/**
 * Component test for the Svelte `RatingDisplay`'s star gradients — a port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-gradient.test.tsx`:
 * each star's fill gradient gets its own distinct id and the star's `fill`
 * points at that id, rendered with Svelte in jsdom.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import RatingDisplay from '../RatingDisplay.svelte'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts `RatingDisplay` with the given props and returns the host markup.
 *
 * @param props - The rating-display props.
 * @returns The markup of the mounted display.
 */
function render(props: Record<string, unknown>): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component: RatingDisplay,
      props,
    },
  })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

describe('<RatingDisplay> star gradient ids', () => {
  it('gives every star a distinct gradient id and points its fill at it', () => {
    const markup = render({ value: 3 })
    const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    const refs = [...markup.matchAll(/fill="url\(#([^)]+)\)"/g)].map((m) => m[1])
    expect(refs).toEqual(ids)
  })
})
