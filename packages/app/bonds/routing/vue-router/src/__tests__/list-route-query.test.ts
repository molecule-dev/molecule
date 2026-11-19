// @vitest-environment jsdom
/**
 * The React bond's `list-route-query` titles, ported to Vue Router: a real Vue Router
 * with the app mounted on it and NO molecule provider. The list's own nav links stand in
 * for `ListRouteNav` (a separate port): each is a `RouterLink` carrying the same
 * `data-mol-id="list-route-<name>"` React's nav writes, so the titles click the same
 * selector.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type VNode, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useListRoute } from '../useListRoute.js'
import { type MountedView, mountRoutes, settle } from './routing-harness.js'

const read = vi.fn(async (saved: boolean) => (saved ? ['Bolt'] : ['Bolt', 'Nut']))
const selections = {
  authored: { path: '/members/:member', label: 'Authored' },
  saved: { path: '/members/:member/saved', label: 'Saved' },
}
const SELECTION_NAMES = Object.keys(selections) as (keyof typeof selections)[]
const views: MountedView[] = []

beforeEach(() => {
  read.mockClear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const view of views.splice(0)) view.unmount()
})

/** The page React's test mounts: nav links, the collection request and a local panel. */
const Page = defineComponent({
  setup() {
    const list = useListRoute({ selections })
    const panel = ref('Preview')
    const rows = ref<string[]>([])
    watch(
      () => list.value.selection,
      (selection) => {
        void read(selection === 'saved').then((next) => {
          rows.value = next
        })
      },
      { immediate: true },
    )
    return (): VNode =>
      h('div', [
        h(
          'nav',
          { 'aria-label': 'Member entries' },
          SELECTION_NAMES.map((name) =>
            h(
              RouterLink,
              {
                key: name,
                'data-mol-id': `list-route-${name}`,
                to: list.value.href({ selection: name }),
              },
              () => selections[name].label,
            ),
          ),
        ),
        h(
          'ul',
          rows.value.map((row) => h('li', { key: row }, row)),
        ),
        h('button', { type: 'button', onClick: () => (panel.value = 'Details') }, panel.value),
      ])
  },
})

/**
 * Mounts the page on a real Vue Router at `initial`, as React's `MemoryRouter
 * initialEntries` does.
 *
 * @param initial - The address the router opens on.
 * @returns The mounted routes and the Vue Router under them.
 */
async function mount(initial: string): Promise<MountedView> {
  const view = await mountRoutes(
    [
      { path: '/members/:member', component: Page },
      { path: '/members/:member/saved', component: Page },
    ],
    initial,
  )
  views.push(view)
  await settle()
  return view
}

it('uses a sibling path selection for both its link and the collection request', async () => {
  const view = await mount('/members/Ada?page=3')
  expect(view.host.querySelectorAll('li')).toHaveLength(2)
  view.host.querySelector<HTMLAnchorElement>('[data-mol-id="list-route-saved"]')!.click()
  await settle()
  expect(read).toHaveBeenLastCalledWith(true)
  expect(view.host.querySelectorAll('li')).toHaveLength(1)
  view.vueRouter.go(-1)
  await settle()
  expect(view.host.querySelectorAll('li')).toHaveLength(2)
  view.vueRouter.go(1)
  await settle()
  expect(view.host.querySelectorAll('li')).toHaveLength(1)
})

it('reads a direct sibling path without inventing a matching query flag', async () => {
  const view = await mount('/members/Ada/saved?page=2')
  expect(read).toHaveBeenLastCalledWith(true)
  expect(view.host.querySelectorAll('li')).toHaveLength(1)
})

it('counterexample: an unrelated query flag and a local panel do not select a path view', async () => {
  const view = await mount('/members/Ada?saved=1')
  expect(read).toHaveBeenLastCalledWith(false)
  expect(view.host.querySelectorAll('li')).toHaveLength(2)
  view.host.querySelector('button')!.click()
  await settle()
  expect(view.host.querySelector('button')!.textContent).toBe('Details')
  expect(view.host.querySelectorAll('li')).toHaveLength(2)
})
