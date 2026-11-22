// @vitest-environment jsdom
/**
 * Package smoke test for `@molecule/app-storefront-chrome-angular` — a port of
 * `@molecule/app-storefront-chrome-react/src/__tests__/smoke.test.ts`: the
 * module imports without throwing. As in the React suite, the styling bond and
 * the router binding are replaced by stand-ins, so this exercises this
 * package's own modules rather than the whole binding graph.
 *
 * @module
 */

import '@angular/compiler'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
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

// The `[molLink]` stand-in is a real standalone directive (a plain class cannot
// stand in for one in a component's `imports`), rendering the href the way the
// React suite's plain-anchor `react-router` mock does.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { Directive } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: Directive({
      selector: 'a[molLink]',
      standalone: true,
      inputs: ['molLink'],
      host: { '[attr.href]': 'molLink ?? null' },
    })(
      class MockLink {
        /** The path the anchor points at. */
        molLink?: string
      },
    ),
  }
})

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
