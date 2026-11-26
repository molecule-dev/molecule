// @vitest-environment jsdom
/**
 * Package smoke test for `@molecule/app-storefront-chrome-vue` — a port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/smoke.test.ts`: the
 * module imports without throwing. As in the React suite, the styling bond and
 * the router binding are replaced by stand-ins, so this exercises this
 * package's own modules rather than the whole binding graph.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, p) =>
          typeof p === 'string' && p === 'cn'
            ? (...args: unknown[]) => args.filter(Boolean).join(' ')
            : (...args: unknown[]) => `mock-${String(p)}-${args.join('-')}`,
      },
    ),
}))

// Render router links as plain anchors, as the React suite mocks `react-router`.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: defineComponent({
      name: 'Link',
      props: { to: { type: String, default: '/' } },
      setup(props, { slots }) {
        return () => h('a', { href: props.to }, slots.default?.())
      },
    }),
  }
})

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
