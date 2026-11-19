/**
 * The React bond's `define-route` titles, carried to SvelteKit's file routing.
 *
 * SvelteKit has no `defineRoute`: a route IS a file under `src/routes`, so the
 * route ID (`/shelves/[shelf]`, the file `shelves/[shelf]/+page.svelte`) is both
 * the declaration that mounts the page and the value the page's params come from.
 * React hands a page its params as a prop and mounts it through `useRoutes`; here
 * kit mounts the file route and the page reads `page.params`, which kit decodes.
 *
 * React's `href` is `defineRoute`'s link builder over React Router's
 * `generatePath`. Its counterpart is {@link routeHref}, which interpolates a route
 * ID's parameters and encodes them exactly as React Router does — kit's own
 * `resolve` writes values unencoded and refuses a value with a leading or trailing
 * `/`, so it cannot build the same links. A page built for a saved record is
 * opened through the router, as a post-save navigation opens it: kit decodes a
 * hash-routed fragment when it first reads the document URL, so an encoded `%2F`
 * survives only a navigation.
 *
 * @module
 */
import { afterEach, beforeEach, expect, it } from 'vitest'

import { routeHref } from '../link-params.js'
import { documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

/**
 * Starts the test app at an in-app path and waits for kit to render it.
 *
 * @param path - The in-app path to open.
 * @returns The started app, once kit has rendered it.
 */
const open = async (path: string): Promise<StartedKit> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await settle(kit.app)
  return kit
}

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', async (path, title) => {
  await open(path)
  expect(container?.querySelector('h1')?.textContent).toBe(title)
})

it.each([
  ['/shelves/reading%20list/edit', 'reading list'],
  ['/shelves/new', ''],
])('initializes the correct draft at %s from the page params prop', async (path, title) => {
  await open(path)
  const input = container?.querySelector<HTMLInputElement>('input[aria-label="Shelf title"]')
  expect(input?.value).toBe(title)
})

it('builds the saved record destination from the same declaration that mounts it', async () => {
  const saved = { slug: 'reference/maps #1' }
  const destination = routeHref('/shelves/[shelf]', { shelf: saved.slug })
  expect(destination).toBe('/shelves/reference%2Fmaps%20%231')

  const started = await open('/library')
  await started.app.router.navigate(destination)
  await settle(started.app)
  // The same declaration mounts the page and hands it the decoded value.
  expect(started.app.router.getParams()).toEqual({ shelf: saved.slug })
  expect(container?.querySelector('h1')?.textContent).toContain(saved.slug)

  // A page can rely on the exact parameter name its declaration names.
  const typed = (params: { shelf: string }): string => routeHref('/shelves/[shelf]', params)
  expect(typed({ shelf: 'reading list' })).toBe('/shelves/reading%20list')
})

it('builds static and optional-parameter links without changing how their pages are mounted', async () => {
  expect(routeHref('/library')).toBe('/library')
  expect(routeHref('/search/[[query]]')).toBe('/search')
  expect(routeHref('/search/[[query]]', { query: 'street maps' })).toBe('/search/street%20maps')
  expect(routeHref('/files/[...rest]', { rest: 'guides/street maps' })).toBe(
    '/files/guides/street%20maps',
  )

  // The same declaration still mounts its page.
  await open('/library')
  expect(container?.querySelector('h1')?.textContent).toBe('library')
})
