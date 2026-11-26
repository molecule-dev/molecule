// @vitest-environment jsdom
/**
 * Ported from `@molecule/app-message-preview-react`'s smoke test: the package
 * module imports without throwing, with its styling and router dependencies
 * mocked.
 *
 * @module
 */

import '@angular/compiler'
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
vi.mock('@molecule/app-ui-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  asTemplate: () => null,
}))
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { Directive } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: Directive({ selector: 'a[molLink]', standalone: true, inputs: ['molLink'] })(
      class MockLink {
        molLink = ''
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
