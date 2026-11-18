// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { expectTypeOf } from 'expect-type'
import { MemoryRouter, type RouteObject, useRoutes } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { defineRoute } from '../defineRoute.js'

afterEach(cleanup)

const routes: RouteObject[] = [
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

function App() {
  return useRoutes(routes)
}

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', (path, title) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: title })).toBeDefined()
})
