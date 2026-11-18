import { MemoryRouter } from '@solidjs/router'
import { render } from 'solid-js/web'
import { expect, expectTypeOf, it } from 'vitest'

import { defineRoute } from '../define-route.js'
import { createSolidMemoryHistory } from '../memory-history.js'
import type { SolidRouteParams } from '../types.js'

const routes = [
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
