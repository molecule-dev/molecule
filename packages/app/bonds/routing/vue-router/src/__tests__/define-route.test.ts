// @vitest-environment jsdom

import { afterEach, expect, expectTypeOf, it } from 'vitest'
import { createApp, h } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw, RouterView } from 'vue-router'

import { defineRoute } from '../define-route.js'
import type { VueRouteParams } from '../types.js'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

const routes: RouteRecordRaw[] = [
  defineRoute('/shelves/:shelf', ({ shelf }) => h('h1', `${shelf}: all`)),
  defineRoute('/shelves/:shelf/saved', (params) => {
    expectTypeOf(params).toEqualTypeOf<Readonly<{ shelf: string | undefined }>>()
    return h('h1', `${params.shelf}: saved`)
  }),
  defineRoute('/shelves/:shelf/filter/:view?', (params) => {
    expectTypeOf(params).toEqualTypeOf<
      Readonly<{ shelf: string | undefined; view: string | undefined }>
    >()
    return h('h1', `${params.shelf}: ${params.view ?? 'all views'}`)
  }),
]

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', async (path, title) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  createApp({ render: () => h(RouterView) })
    .use(router)
    .mount(host)
  expect(host.querySelector('h1')?.textContent).toBe(title)
})

it('joins a repeated parameter with slashes and leaves an empty one undefined', async () => {
  const seen: unknown[] = []
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      defineRoute('/files/:path+', (params) => {
        seen.push(params.path)
        return h('p')
      }),
      defineRoute('/docs/:rest*', (params) => {
        seen.push(params.rest)
        return h('p')
      }),
    ],
  })
  await router.push('/files/a/b/c')
  const host = document.createElement('div')
  hosts.push(host)
  createApp({ render: () => h(RouterView) })
    .use(router)
    .mount(host)
  await router.push('/docs')
  await router.push('/docs/x/y')
  expect(seen).toEqual(['a/b/c', undefined, 'x/y'])
})

it('types the parameters of every Vue Router parameter form', () => {
  expectTypeOf<VueRouteParams<'/a/:id(\\d+)/b/:tags+/c/:rest*/:opt?'>>().toEqualTypeOf<
    Readonly<{
      id: string | undefined
      tags: string | undefined
      rest: string | undefined
      opt: string | undefined
    }>
  >()
  expectTypeOf<VueRouteParams<'/:id((?:a|b)\\))'>>().toEqualTypeOf<
    Readonly<{ id: string | undefined }>
  >()
  expectTypeOf<VueRouteParams<'/about'>>().toEqualTypeOf<
    Readonly<Record<never, string | undefined>>
  >()
})

it('rejects a parameter the path does not declare', () => {
  defineRoute('/shelves/:shelf', (params) => {
    expectTypeOf(params).not.toHaveProperty('book')
    expectTypeOf(params).toHaveProperty('shelf')
    return h('p')
  })
  expectTypeOf<VueRouteParams<'/shelves/:shelf'>>().not.toHaveProperty('view')
})
