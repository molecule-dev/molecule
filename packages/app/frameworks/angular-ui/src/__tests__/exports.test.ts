/**
 * Tests for the angular-ui package's exported API surface.
 *
 * angular-ui ships `@Component`-decorated classes; node-env vitest can't
 * bootstrap them through TestBed, so this verifies the package loads and
 * exposes a constructable component class per primitive. `@molecule/app-ui`
 * + `@molecule/app-icons` are stubbed so module evaluation stays
 * self-contained.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
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

describe('@molecule/app-ui-angular exports', () => {
  // Instantiating an @Component class would pull in Angular's JIT compiler
  // (TestBed territory), so this stays at "the decorated class loaded and is
  // exported" — the surface reliably checkable in plain node-env vitest.
  it('exposes a component class per primitive', () => {
    for (const name of [
      'MoleculeAlert',
      'MoleculeBadge',
      'MoleculeButton',
      'MoleculeCheckbox',
      'MoleculeInput',
      'MoleculeModal',
      'MoleculeRadioGroup',
      'MoleculeSelect',
      'MoleculeSpinner',
      'MoleculeSwitch',
      'MoleculeToast',
      'MoleculeTooltip',
    ]) {
      const ctor = (pkg as Record<string, unknown>)[name]
      expect(typeof ctor, name).toBe('function')
      expect((ctor as { name: string }).name, name).toBe(name)
    }
  })

  it('re-exports the cn + getIconSvg utilities', () => {
    expect(typeof pkg.cn).toBe('function')
    expect(typeof pkg.getIconSvg).toBe('function')
  })
})
