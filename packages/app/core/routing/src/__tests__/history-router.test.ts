/**
 * `createHistoryRouter`'s `createHref` and the errors its named routes and paths throw: an
 * `I18nError` with the key a UI translates, from every router built on it.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import { createHistoryRouter, parseLocation } from '../history-router.js'
import { createBrowserRouter, createMemoryRouter } from '../router.js'
import type { RouterHistory } from '../types.js'
import { generatePath } from '../utilities.js'

/**
 * A history over one in-memory entry.
 *
 * @param createHref - The history's own `createHref`, when it has one.
 * @returns The history.
 */
const history = (createHref?: (path: string) => string): RouterHistory => {
  let path = '/'
  return {
    location: () => parseLocation(path),
    push: (next) => {
      path = next
    },
    replace: (next) => {
      path = next
    },
    go: () => undefined,
    listen: () => () => undefined,
    ...(createHref ? { createHref } : {}),
  }
}

/**
 * Runs `action` and returns what it threw.
 *
 * @param action - The action.
 * @returns The thrown value.
 */
const thrown = (action: () => unknown): unknown => {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error('expected the action to throw')
}

describe('createHref', () => {
  it('is the href the native history writes for the path', () => {
    const router = createHistoryRouter(history((path) => `#${path}`))
    expect(router.createHref('/orders?page=2#top')).toBe('#/orders?page=2#top')
  })

  it('counterexample: is the path itself when the history writes paths unchanged', () => {
    expect(createHistoryRouter(history()).createHref('/orders?page=2')).toBe('/orders?page=2')
    expect(createBrowserRouter().createHref('/orders')).toBe('/orders')
    expect(createMemoryRouter().createHref('/orders')).toBe('/orders')
  })
})

describe('navigate to a query or hash alone', () => {
  // React Router's `navigate('?tab=profile')` stays on the current page; every router built on
  // this one must do the same, or a tab or paging control lands on `/`.
  const at = (path: string): ReturnType<typeof createMemoryRouter> =>
    createMemoryRouter({ initialEntries: [path] })

  it('keeps the current pathname for a query-only target', () => {
    const router = at('/settings/team?tab=members#roles')
    router.navigate('?tab=profile')
    expect(router.getLocation()).toMatchObject({
      pathname: '/settings/team',
      search: '?tab=profile',
      hash: '',
    })
  })

  it('keeps the current pathname, and drops the query, for a hash-only target', () => {
    const router = at('/docs/install?lang=ts')
    router.navigate('#usage')
    expect(router.getLocation()).toMatchObject({
      pathname: '/docs/install',
      search: '',
      hash: '#usage',
    })
  })

  it('keeps the current query for a hash-only target when asked to', () => {
    const router = at('/docs/install?lang=ts')
    router.navigate('#usage', { preserveQuery: true })
    expect(router.getLocation()).toMatchObject({
      pathname: '/docs/install',
      search: '?lang=ts',
      hash: '#usage',
    })
  })

  it('counterexample: a target with a pathname replaces the pathname', () => {
    const router = at('/settings/team?tab=members')
    router.navigate('/billing?tab=invoices')
    expect(router.getLocation()).toMatchObject({ pathname: '/billing', search: '?tab=invoices' })
  })
})

describe('getParams', () => {
  const routes = [{ path: '/users/:id', name: 'user' }]
  const at = (path: string, params: () => Record<string, string>) => {
    const native = history()
    native.push(path)
    return createHistoryRouter({ ...native, params }, { routes })
  }

  it('reads the registered definitions when the native router matched no params', () => {
    expect(at('/users/ada', () => ({})).getParams()).toEqual({ id: 'ada' })
  })

  it('counterexample: the native params win when the native router matched some', () => {
    expect(at('/users/ada', () => ({ id: 'native' })).getParams()).toEqual({ id: 'native' })
  })
})

describe('routing errors', () => {
  const router = createHistoryRouter(history(), { routes: [{ path: '/users/:id', name: 'user' }] })

  it('throws I18nError routing.error.routeNotFound for an unknown named route', () => {
    for (const error of [
      thrown(() => router.navigateTo('unknown')),
      thrown(() => router.generatePath('unknown')),
    ]) {
      expect(error).toBeInstanceOf(I18nError)
      expect((error as I18nError).i18nKey).toBe('routing.error.routeNotFound')
      expect((error as I18nError).i18nValues).toEqual({ name: 'unknown' })
      expect((error as I18nError).message).toBe('Route "unknown" not found')
    }
  })

  it('throws I18nError routing.error.missingParam for a missing path param', () => {
    for (const error of [
      thrown(() => generatePath('/users/:id', {})),
      thrown(() => router.generatePath('user')),
    ]) {
      expect(error).toBeInstanceOf(I18nError)
      expect((error as I18nError).i18nKey).toBe('routing.error.missingParam')
      expect((error as I18nError).i18nValues).toEqual({ name: 'id', pattern: '/users/:id' })
    }
  })
})
