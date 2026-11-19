/**
 * `createHref` under the Next.js App Router: the href Next's `<Link>` renders, with the
 * basePath `next.config` compiles in (`process.env.__NEXT_ROUTER_BASEPATH`) unless the
 * config names one.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { createNextRouter } from '../provider.js'

afterEach(() => {
  delete process.env.__NEXT_ROUTER_BASEPATH
})

describe('createHref', () => {
  it('is the path when no basePath is configured or compiled in', () => {
    expect(createNextRouter().createHref('/orders?page=2#top')).toBe('/orders?page=2#top')
  })

  it("puts the basePath Next compiled in before the path, as Next's <Link> does", () => {
    process.env.__NEXT_ROUTER_BASEPATH = '/docs'
    expect(createNextRouter().createHref('/orders/7')).toBe('/docs/orders/7')
  })

  it('uses the configured basePath over the compiled one', () => {
    process.env.__NEXT_ROUTER_BASEPATH = '/docs'
    expect(createNextRouter({ basePath: '/app' }).createHref('/orders')).toBe('/app/orders')
    expect(createNextRouter({ basePath: '' }).createHref('/orders')).toBe('/orders')
  })
})
