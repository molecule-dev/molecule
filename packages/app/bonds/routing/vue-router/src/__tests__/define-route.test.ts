// @vitest-environment jsdom

import { afterEach, expect, expectTypeOf, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type PropType, ref } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
  RouterView,
} from 'vue-router'

import { defineRoute } from '../define-route.js'
import type { VueRouteParams } from '../types.js'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

/**
 * Mounts a router's view into a fresh host element.
 *
 * @param router - The Vue Router instance to mount.
 * @param path - Where to navigate before the first render, when given.
 * @returns The host element holding the rendered view.
 */
async function mount(router: VueRouterInstance, path?: string): Promise<HTMLElement> {
  if (path !== undefined) await router.push(path)
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  createApp({ render: () => h(RouterView) })
    .use(router)
    .mount(host)
  return host
}

/** A page that keeps a draft initialized from its `params` prop. */
const ShelfForm = defineComponent({
  props: {
    params: { type: Object as PropType<{ shelf: string | undefined }>, required: true },
  },
  setup(props) {
    const title = ref(props.params.shelf ?? '')
    return () =>
      h('input', {
        'aria-label': 'Shelf title',
        value: title.value,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement) title.value = event.target.value
        },
      })
  },
})

const routes: RouteRecordRaw[] = [
  defineRoute('/shelves/new', { Component: ShelfForm }),
  defineRoute('/shelves/:shelf/edit', { Component: ShelfForm }),
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
  const host = await mount(router, path)
  expect(host.querySelector('h1')?.textContent).toBe(title)
})

it.each([
  ['/shelves/reading%20list/edit', 'reading list'],
  ['/shelves/new', ''],
])('initializes the correct draft at %s from the page params prop', async (path, title) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const host = await mount(router, path)
  expect(host.querySelector('input')?.value).toBe(title)
})

it('builds the saved record destination from the same declaration that mounts it', async () => {
  const detail = defineRoute('/shelves/:shelf', ({ shelf }) => h('h1', shelf ?? ''))
  const saved = { slug: 'reference/maps #1' }
  const destination = detail.href({ shelf: saved.slug })
  expect(destination).toBe('/shelves/reference%2Fmaps%20%231')

  const router = createRouter({ history: createMemoryHistory(), routes: [detail] })
  const host = await mount(router, destination)
  expect(host.querySelector('h1')?.textContent).toBe(saved.slug)
  expectTypeOf(detail.href).parameter(0).toExtend<{ shelf: string }>()
})

it('builds static and optional-parameter links without changing how their pages are mounted', async () => {
  const home = defineRoute('/library', () => h('h1', 'Library'))
  const search = defineRoute('/search/:query?', (params) => h('h1', params.query ?? 'All'))
  // Vue Router spells React's `*` splat as a repeatable custom-regexp parameter.
  const files = defineRoute('/files/:pathMatch(.*)*', (params) =>
    h('h1', params.pathMatch ?? 'Files'),
  )
  expect(home.href()).toBe('/library')
  expect(search.href()).toBe('/search')
  expect(search.href({ query: 'street maps' })).toBe('/search/street%20maps')
  expect(files.href({ pathMatch: 'guides/street maps' })).toBe('/files/guides/street%20maps')

  const router = createRouter({ history: createMemoryHistory(), routes: [home, search, files] })
  const host = await mount(router, home.href())
  expect(host.querySelector('h1')?.textContent).toBe('Library')
  await router.push(search.href({ query: 'street maps' }))
  await nextTick()
  expect(host.querySelector('h1')?.textContent).toBe('street maps')
  await router.push(files.href({ pathMatch: 'guides/street maps' }))
  await nextTick()
  expect(host.querySelector('h1')?.textContent).toBe('guides/street maps')
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

/** A page whose `params` prop names the parameter its route must declare. */
const TypecheckedShelf = defineComponent({
  props: {
    params: { type: Object as PropType<{ shelf: string | undefined }>, required: true },
  },
  setup: () => () => null,
})

// A page can rely on the exact parameter name its route declares.
defineRoute('/shelves/:shelf/edit', { Component: TypecheckedShelf })
// The binding is type-checked against the declared path, so a page requiring `shelf`
// is rejected for a route that declares `folder` instead.
expectTypeOf<{ params: VueRouteParams<'/shelves/:shelf/edit'> }>().toExtend<{
  params: { shelf: string | undefined }
}>()
expectTypeOf<{ params: VueRouteParams<'/shelves/:folder/edit'> }>().not.toExtend<{
  params: { shelf: string | undefined }
}>()
