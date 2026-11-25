// @vitest-environment jsdom

/**
 * `useLinkRouter`: the router a link to a destination navigates through, with a router registered
 * and with none, which is how every binding's `Link` tells a URL outside the app from an app path.
 *
 * @module
 */

import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import { useLinkRouter } from '../hooks/use-router.js'
import { provideMolecule } from '../providers.js'

/** The key of the error a routing function throws with no router registered. */
const NO_ROUTER_ERROR_KEY = 'angular.error.useRouterOutsideProvider'

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

/**
 * Configures the testing module with `router` registered through `provideMolecule`,
 * which an app with no router gives without one for `null`.
 *
 * @param router - The router, or `null`.
 */
function register(router: Router | null): void {
  TestBed.configureTestingModule({ providers: [provideMolecule({ router: router ?? undefined })] })
}

/** What a link router gave for a destination, or the error it threw. */
const outcomeOf = (read: () => unknown): unknown => {
  try {
    return read()
  } catch (error) {
    return error
  }
}

/** Whether what a probe got is the binding's no-router error. */
const isNoRouterError = (seen: unknown): boolean =>
  seen instanceof I18nError && seen.i18nKey === NO_ROUTER_ERROR_KEY

describe('useLinkRouter', () => {
  it('gives the mounted router for an app path and for a URL', () => {
    const router = createMemoryRouter()
    register(router)
    const given = TestBed.runInInjectionContext(() => [
      useLinkRouter('/settings?tab=billing#plan')(),
      useLinkRouter('https://elsewhere.example/page')(),
      useLinkRouter('mailto:help@example.com')(),
    ])
    expect(given).toEqual([router, router, router])
  })

  it('gives null for a URL outside the app with no router mounted', () => {
    register(null)
    const given = TestBed.runInInjectionContext(() => [
      useLinkRouter('https://elsewhere.example/page')(),
      useLinkRouter('mailto:help@example.com')(),
      useLinkRouter('//cdn.example/file')(),
    ])
    expect(given).toEqual([null, null, null])
  })

  it('throws the no-router error for an app path with no router mounted', () => {
    register(null)
    const thrown = outcomeOf(() =>
      TestBed.runInInjectionContext(() => useLinkRouter('/settings?tab=billing#plan')),
    )
    expect(thrown).toBeInstanceOf(I18nError)
    expect(isNoRouterError(thrown)).toBe(true)
  })

  it('checks a destination again when it changes from a URL to an app path', () => {
    register(null)
    const to = signal('https://elsewhere.example/page')
    const router = TestBed.runInInjectionContext(() => useLinkRouter(to))
    expect(router()).toBeNull()
    // The destination changing is where the link finds out: the signal asks again and throws.
    to.set('/settings')
    const thrown = outcomeOf(router)
    expect(thrown).toBeInstanceOf(I18nError)
    expect(isNoRouterError(thrown)).toBe(true)
  })

  it('gives a function to call with the destination when called without one', () => {
    const router = createMemoryRouter()
    register(router)
    const given = TestBed.runInInjectionContext(() => {
      const linkRouter = useLinkRouter()
      return [linkRouter('/settings'), linkRouter('https://elsewhere.example/page')]
    })
    expect(given).toEqual([router, router])
  })

  it('gives that function with no router too, and it fails an app path there', () => {
    register(null)
    const given = TestBed.runInInjectionContext(() => {
      const linkRouter = useLinkRouter()
      return [
        outcomeOf(() => linkRouter('https://elsewhere.example/page')),
        outcomeOf(() => linkRouter('/settings')),
      ]
    })
    expect(given).toHaveLength(2)
    expect(given[0]).toBeNull()
    expect(given[1]).toBeInstanceOf(I18nError)
    expect(isNoRouterError(given[1])).toBe(true)
  })
})
