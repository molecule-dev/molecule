/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual `@molecule/app-bond`
 * registry behind `setClassMap`/`getClassMap`/`setProvider`, and the REAL
 * `extendClassMap` composition flow exactly as the module docs teach it.
 *
 * Modeled on `api/bonds/two-factor/otplib/src/__tests__/provider.integration.test.ts`:
 * exercises the full consumer lifecycle end-to-end (wire → resolve → extend →
 * hot-swap → unwire), one CONSUMER-EXPERIENCE property (the documented
 * extend-a-resolver flow survives a realistic layered-theming setup), and
 * FAILURE DISAMBIGUATION (an unwired ClassMap names its own fix and is
 * distinguishable from a merely-missing UI provider).
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { UIClassMap, UIProvider } from '../index.js'
import {
  extendClassMap,
  getClassMap,
  getProvider,
  hasClassMap,
  hasProvider,
  setClassMap,
  setProvider,
} from '../index.js'

/** A genuine minimal ClassMap "styling library" (only the members exercised). */
const makeBase = (): UIClassMap =>
  ({
    page: 'base-page',
    surface: 'base-surface',
    button: (opts: { variant?: string; size?: string } = {}) =>
      `btn btn-${opts.variant ?? 'solid'} btn-${opts.size ?? 'md'}`,
    spinner: () => 'spin',
    cn: (...classes: unknown[]) =>
      classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' '),
  }) as unknown as UIClassMap

afterEach(() => {
  // Unwire both bonds so no test leaks registry state into another file
  // (the registry is a real module-level singleton — that is the point).
  setClassMap(undefined as unknown as UIClassMap)
  setProvider(undefined as unknown as UIProvider)
})

describe('@molecule/app-ui × REAL @molecule/app-bond registry', () => {
  it('full lifecycle: wire → resolve → hot-swap → unwire, through the real registry', () => {
    expect(hasClassMap()).toBe(false)

    const tailwindish = makeBase()
    setClassMap(tailwindish)
    expect(hasClassMap()).toBe(true)
    expect(getClassMap()).toBe(tailwindish)
    // The resolver actually resolves — this is the render-time call path
    // every framework component (`@molecule/app-ui-react` etc.) depends on.
    expect(getClassMap().button({ variant: 'outline' })).toBe('btn btn-outline btn-md')

    // Hot-swap the styling library at runtime (the decoupling contract:
    // swapping bonds must not require consumers to re-resolve anything).
    const bootstrapish = makeBase()
    ;(bootstrapish as unknown as { page: string }).page = 'bs-page'
    setClassMap(bootstrapish)
    expect(getClassMap()).toBe(bootstrapish)
    expect((getClassMap() as unknown as { page: string }).page).toBe('bs-page')

    // Unwire: hasClassMap flips back and getClassMap throws again.
    setClassMap(undefined as unknown as UIClassMap)
    expect(hasClassMap()).toBe(false)
    expect(() => getClassMap()).toThrow()
  })

  it('CONSUMER PROPERTY: the documented extendClassMap layering flow works end-to-end', () => {
    // The module docs teach: bond the library ClassMap, then re-bond an
    // extended map whose function overrides call the BASE resolvers. A theme
    // layer doing exactly that must (1) compose, (2) preserve untouched
    // members, (3) never mutate the base, and (4) resolve through getClassMap.
    const base = makeBase()
    setClassMap(
      extendClassMap(base, (b) => ({
        button: (opts) => b.cn(b.button(opts), 'my-rounded-button'),
        page: 'my-dark-page',
      })),
    )

    const cm = getClassMap()
    // (1) composed: base output + the extension
    expect(cm.button({ variant: 'ghost' })).toBe('btn btn-ghost btn-md my-rounded-button')
    // (2) untouched members preserved
    expect((cm as unknown as { surface: string }).surface).toBe('base-surface')
    expect(cm.spinner()).toBe('spin')
    // (3) the base map was not mutated (a second extension can layer on it)
    expect(base.button({ variant: 'ghost' })).toBe('btn btn-ghost btn-md')
    expect((base as unknown as { page: string }).page).toBe('base-page')
    // (4) a second layer on top of the FIRST extension keeps both layers
    setClassMap(
      extendClassMap(cm, (b) => ({
        button: (opts) => b.cn(b.button(opts), 'brand-accent'),
      })),
    )
    expect(getClassMap().button()).toBe('btn btn-solid btn-md my-rounded-button brand-accent')
  })

  it('FAILURE DISAMBIGUATION: unwired ClassMap names its own fix; UI provider is a separate bond', () => {
    // 1. No ClassMap: the error must tell the caller WHAT to call and WHERE
    //    the implementation comes from — "wire setClassMap at startup", not a
    //    generic undefined crash deep inside a component.
    expect(hasClassMap()).toBe(false)
    let message = ''
    try {
      getClassMap()
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('No UIClassMap has been set')
    expect(message).toContain('setClassMap()')
    expect(message).toContain('app-ui-tailwind') // points at a concrete bond to install

    // 2. The `ui` provider bond and the `ui-classmap` bond are independent —
    //    wiring one must not mask the other's absence (a caller can tell
    //    "styling unwired" apart from "UI provider unwired").
    setProvider({ name: 'tailwind' })
    expect(hasProvider()).toBe(true)
    expect(getProvider()?.name).toBe('tailwind')
    expect(hasClassMap()).toBe(false) // still unwired
    expect(() => getClassMap()).toThrow(/No UIClassMap has been set/)

    setClassMap(makeBase())
    expect(hasClassMap()).toBe(true)
    // getProvider is a soft accessor: it returns undefined rather than
    // throwing when unwired — the two failure surfaces stay distinct.
    setProvider(undefined as unknown as UIProvider)
    expect(getProvider()).toBeUndefined()
    expect(hasProvider()).toBe(false)
    expect(hasClassMap()).toBe(true)
  })
})
