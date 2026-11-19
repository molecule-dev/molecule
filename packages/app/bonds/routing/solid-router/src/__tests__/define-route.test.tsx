import type { RouteDefinition } from '@solidjs/router'
import { MemoryRouter } from '@solidjs/router'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { expect, expectTypeOf, it } from 'vitest'

import { defineRoute } from '../define-route.js'
import { createSolidMemoryHistory } from '../memory-history.js'
import type { SolidRouteParams } from '../types.js'

/**
 * A page whose draft starts from the params the route declares, mounted through the
 * `{ Component }` form. Solid's component receives the params as a prop, as React's does.
 *
 * @param props - The page's typed params prop.
 * @returns The draft input.
 */
function ShelfForm(props: { params: { shelf?: string | undefined } }): JSX.Element {
  const [title, setTitle] = createSignal(props.params.shelf ?? '')
  return (
    <input
      aria-label="Shelf title"
      value={title()}
      onInput={(event) => setTitle(event.currentTarget.value)}
    />
  )
}

const routes = [
  defineRoute('/shelves/new', { Component: ShelfForm }),
  defineRoute('/shelves/:shelf/edit', { Component: ShelfForm }),
  defineRoute('/shelves/:shelf', ({ shelf }) => <h1>{shelf}: all</h1>),
  defineRoute('/shelves/:shelf/saved', (params) => {
    expectTypeOf(params).toEqualTypeOf<Readonly<{ shelf: string | undefined }>>()
    return <h1>{params.shelf}: saved</h1>
  }),
  defineRoute('/shelves/:shelf/filter/:view?', (params) => {
    expectTypeOf(params).toEqualTypeOf<
      Readonly<{ shelf: string | undefined; view: string | undefined }>
    >()
    return (
      <h1>
        {params.shelf}: {params.view ?? 'all views'}
      </h1>
    )
  }),
]

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', (path, title) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <MemoryRouter history={createSolidMemoryHistory([path])}>{routes}</MemoryRouter>,
    container,
  )
  expect(container.querySelector('h1')?.textContent).toBe(title)
  dispose()
  container.remove()
})

it.each([
  ['/shelves/reading%20list/edit', 'reading list'],
  ['/shelves/new', ''],
])('initializes the correct draft at %s from the page params prop', (path, title) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <MemoryRouter history={createSolidMemoryHistory([path])}>{routes}</MemoryRouter>,
    container,
  )
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe(title)
  dispose()
  container.remove()
})

it('builds the saved record destination from the same declaration that mounts it', () => {
  const detail = defineRoute('/shelves/:shelf', ({ shelf }) => <h1>{shelf}</h1>)
  const saved = { slug: 'reference/maps #1' }
  const destination = detail.href({ shelf: saved.slug })
  expect(destination).toBe('/shelves/reference%2Fmaps%20%231')

  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <MemoryRouter history={createSolidMemoryHistory([destination])}>{[detail]}</MemoryRouter>,
    container,
  )
  expect(container.querySelector('h1')?.textContent).toBe(saved.slug)
  dispose()
  container.remove()
  expectTypeOf(detail.href).parameter(0).toExtend<{ shelf: string }>()
})

it('builds static and optional-parameter links without changing how their pages are mounted', () => {
  const home = defineRoute('/library', () => <p>library</p>)
  const search = defineRoute('/search/:query?', () => <p>search</p>)
  const files = defineRoute('/files/*', () => <p>files</p>)
  expect(home.href()).toBe('/library')
  expect(search.href()).toBe('/search')
  expect(search.href({ query: 'street maps' })).toBe('/search/street%20maps')
  expect(files.href({ '*': 'guides/street maps' })).toBe('/files/guides/street%20maps')

  // Each declaration still mounts its page, under the same path its link points at.
  const mount = (path: string, route: RouteDefinition): string | null => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(
      () => <MemoryRouter history={createSolidMemoryHistory([path])}>{[route]}</MemoryRouter>,
      container,
    )
    const text = container.querySelector('p')?.textContent ?? null
    dispose()
    container.remove()
    return text
  }
  expect(mount(search.href({ query: 'street maps' }), search)).toBe('search')
  expect(mount(files.href({ '*': 'guides/street maps' }), files)).toBe('files')
  expect(mount(home.href(), home)).toBe('library')
})

it('types the parameters of every Solid Router parameter form', () => {
  expectTypeOf<SolidRouteParams<'/a/:id/b/:opt?/*rest'>>().toEqualTypeOf<
    Readonly<{ id: string | undefined; opt: string | undefined; rest: string | undefined }>
  >()
  expectTypeOf<SolidRouteParams<'/about/*'>>().toEqualTypeOf<
    Readonly<Record<never, string | undefined>>
  >()
})

it('rejects a parameter the path does not declare', () => {
  defineRoute('/shelves/:shelf', (params) => {
    expectTypeOf(params).not.toHaveProperty('book')
    expectTypeOf(params).toHaveProperty('shelf')
    return <p />
  })
  expectTypeOf<SolidRouteParams<'/shelves/:shelf'>>().not.toHaveProperty('view')
})

/** A page that relies on the exact parameter name its route declares. */
function TypecheckedShelf(_props: { params: { shelf: string | undefined } }): JSX.Element {
  return <span />
}

// A page can rely on the exact parameter name its route declares.
defineRoute('/shelves/:shelf/edit', { Component: TypecheckedShelf })
// The `{ Component }` form refuses a page that needs a parameter the path does not declare:
// unlike React's test, which reads the compile error, this asserts the page type.
expectTypeOf<Parameters<typeof defineRoute<'/shelves/:folder/edit'>>[1]>().not.toExtend<{
  Component: typeof TypecheckedShelf
}>()
