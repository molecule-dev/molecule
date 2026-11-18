// @vitest-environment jsdom
/**
 * Component test for the Vue `RatingDisplay`'s star gradients — a port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-gradient.test.tsx`:
 * each star's fill gradient gets its own distinct id and the star's `fill`
 * points at that id, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so no real bond is needed — the same mock the other port tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h } from 'vue'

import { RatingDisplay } from '../RatingDisplay.js'
import type { RatingDisplayProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link RatingDisplay} and returns the markup it produced.
 *
 * @param props - The RatingDisplay props.
 * @returns The rendered markup.
 */
const render = (props: RatingDisplayProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(RatingDisplay, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
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
