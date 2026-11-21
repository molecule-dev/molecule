// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-weather-card-svelte` — a port of
 * `@molecule/app-weather-card-react/src/__tests__/smoke.test.ts`: the same
 * test names and the same assertions, with the Svelte binding standing in for
 * the React one.
 *
 * @module
 */

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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts?.defaultValue ?? '',
  }),
}))

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
