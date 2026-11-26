/**
 * Each star's fill gradient gets its own stable id from React, and the star's
 * `fill` points at that id — no `Math.random()` in the render path.
 *
 * @module
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { RatingDisplay } = await import('../RatingDisplay.js')

describe('<RatingDisplay> star gradient ids', () => {
  it('gives every star a distinct gradient id and points its fill at it', () => {
    const markup = renderToStaticMarkup(createElement(RatingDisplay, { value: 3 }))
    const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    const refs = [...markup.matchAll(/fill="url\(#([^)]+)\)"/g)].map((m) => m[1])
    expect(refs).toEqual(ids)
  })
})
