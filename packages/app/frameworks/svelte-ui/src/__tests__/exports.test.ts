/**
 * Tests for the svelte-ui package's exported API surface.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const pkg = await import('../index.js')

describe('@molecule/app-ui-svelte exports', () => {
  it('re-exports the framework-agnostic utilities', () => {
    expect(typeof pkg.cn).toBe('function')
    expect(typeof pkg.getInitials).toBe('function')
    expect(typeof pkg.generatePaginationRange).toBe('function')
    expect(typeof pkg.getIconData).toBe('function')
    expect(typeof pkg.statusIconMap).toBe('object')
  })

  it('re-exports component class generators for every primitive', () => {
    for (const name of [
      'getButtonClasses',
      'getAlertClasses',
      'getAvatarClasses',
      'getBadgeClasses',
      'getCardClasses',
      'getCheckboxClasses',
      'getInputClasses',
      'getModalContentClasses',
      'getPaginationClasses',
      'getProgressClasses',
      'getSelectClasses',
      'getTableClasses',
      'getTabsListClasses',
      'getToastClasses',
      'getTooltipClasses',
    ]) {
      expect(typeof (pkg as Record<string, unknown>)[name], name).toBe('function')
    }
  })

  it('exposes the toast-helper factory', () => {
    expect(typeof pkg.createToastHelpers).toBe('function')
  })

  it('does not leak a default export', () => {
    expect((pkg as Record<string, unknown>).default).toBeUndefined()
  })
})
