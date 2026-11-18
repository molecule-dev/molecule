// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { expectTypeOf } from 'expect-type'
import { useState } from 'react'
import { MemoryRouter, type RouteObject, useRoutes } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { defineRoute } from '../defineRoute.js'

afterEach(cleanup)

function ShelfForm({ params }: { params: { shelf?: string | undefined } }) {
  const [title, setTitle] = useState(params.shelf ?? '')
  return <input aria-label="Shelf title" value={title} onChange={(e) => setTitle(e.target.value)} />
}

const routes: RouteObject[] = [
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

it.each([
  ['/shelves/reading%20list/edit', 'reading list'],
  ['/shelves/new', ''],
])('initializes the correct draft at %s from the page params prop', (path, title) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Shelf title' }).value).toBe(title)
})

function TypecheckedShelf(_props: { params: { shelf: string | undefined } }) {
  return null
}

// A page can rely on the exact parameter name its route declares.
defineRoute('/shelves/:shelf/edit', { Component: TypecheckedShelf })
// @ts-expect-error The page requires 'shelf', which the route must declare.
defineRoute('/shelves/:folder/edit', { Component: TypecheckedShelf })
