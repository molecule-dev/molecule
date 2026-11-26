// @vitest-environment jsdom
/**
 * Component test for the Solid `RatingDisplay`'s star gradients — a port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-gradient.test.tsx`:
 * each star's fill gradient gets its own distinct id and the star's `fill`
 * points at that id, rendered with Solid in jsdom.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so no real bond is needed — the same mock the other port tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { RatingDisplay } = await import('../RatingDisplay.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to mount.
 * @returns The container the view was mounted into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('<RatingDisplay> star gradient ids', () => {
  it('gives every star a distinct gradient id and points its fill at it', () => {
    const container = mount(() => <RatingDisplay value={3} />)
    const markup = container.innerHTML
    const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    const refs = [...markup.matchAll(/fill="url\(#([^)]+)\)"/g)].map((m) => m[1])
    expect(refs).toEqual(ids)
  })
})
