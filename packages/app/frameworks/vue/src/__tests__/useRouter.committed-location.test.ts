// @vitest-environment jsdom

/**
 * The routing composables and `RoutedView`, under `@molecule/app-react`'s test titles. A component
 * that stays mounted across a navigation renders the new location in its first render after it;
 * a parent that reads the location shows a navigation its child made in its own `onMounted`,
 * which runs before the parent subscribes; `RoutedView` renders the routing bond's routed view
 * and throws when there is none.
 *
 * Each case records what each RENDER saw, so a stale render fails even though the settled DOM is
 * the same either way.
 *
 * @module
 */

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { type Component, defineComponent, h, nextTick, onMounted, type VNode } from 'vue'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import {
  useLocation,
  useNavigate,
  useParams,
  useQuery,
  useRouterInstance,
} from '../composables/useRouter.js'
import { RouterProvider } from '../providers.js'
import { RoutedView } from '../routed-view.js'

const wrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts `root`, catching what its tree throws while it mounts.
 *
 * @param root - The component to mount.
 * @returns Its text and the error it threw, if any.
 */
function mountCatching(root: Component): { text: () => string; thrown: () => unknown } {
  let thrown: unknown
  let text = (): string => ''
  try {
    const wrapper = mount(root)
    wrappers.push(wrapper)
    text = () => wrapper.text()
  } catch (error) {
    thrown = error
  }
  return { text: () => text(), thrown: () => thrown }
}

/**
 * Mounts `child` under a `RouterProvider`, catching what the tree throws.
 *
 * @param props - The provider's props.
 * @param child - The tree under it.
 * @returns Its text and the error it threw, if any.
 */
const mountUnder = (
  props: { router: Router; routedView?: Component },
  child: () => VNode,
): { text: () => string; thrown: () => unknown } =>
  mountCatching(defineComponent({ setup: () => () => h(RouterProvider, props, child) }))

describe('the routing hooks across a navigation', () => {
  it('render the new location, params and query in the first commit after it', async () => {
    const router = createMemoryRouter({
      initialEntries: ['/items/1?tab=a'],
      routes: [{ path: '/items/:id' }],
    })
    const renders: string[] = []
    const Page = defineComponent({
      setup() {
        const location = useLocation()
        const params = useParams<{ id: string }>()
        const query = useQuery<{ tab?: string }>()
        return () => {
          const seen = `${location.value.pathname}${location.value.search} id=${params.value.id} tab=${query.value.tab}`
          renders.push(seen)
          return h('p', seen)
        }
      },
    })
    mountUnder({ router }, () => h(Page))
    await nextTick()
    renders.length = 0
    router.navigate('/items/2?tab=b')
    await nextTick()
    expect(renders.length).toBeGreaterThan(0)
    expect(renders).toEqual(renders.map(() => '/items/2?tab=b id=2 tab=b'))
  })

  it('counterexample: a location that does not change renders no new value', async () => {
    const router = createMemoryRouter({ initialEntries: ['/items/1'] })
    const renders: string[] = []
    const Page = defineComponent({
      setup() {
        const location = useLocation()
        return () => {
          renders.push(location.value.pathname)
          return h('p', location.value.pathname)
        }
      },
    })
    mountUnder({ router }, () => h(Page))
    await nextTick()
    expect(renders).toEqual(['/items/1'])
  })

  it('a parent reading the location shows the navigation a child makes as it mounts', async () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    // Redirects as it mounts, as a guard does. Its onMounted runs before its parent's.
    const Child = defineComponent({
      setup() {
        const navigate = useNavigate()
        onMounted(() => navigate('/moved'))
        return () => null
      },
    })
    // Shows the path, as a layout computing its active item does.
    const Parent = defineComponent({
      setup() {
        const location = useLocation()
        return () => h('p', [location.value.pathname, h(Child)])
      },
    })
    const mounted = mountUnder({ router }, () => h(Parent))
    await nextTick()
    expect(mounted.text()).toBe('/moved')
  })
})

describe('RoutedView', () => {
  it("renders the routed view the routing bond's RouterProvider was given", () => {
    const router = createMemoryRouter()
    // The bond's outlet.
    const Outlet: Component = defineComponent({ setup: () => () => h('p', 'routed page') })
    const mounted = mountUnder({ router, routedView: Outlet }, () => h(RoutedView))
    expect(mounted.thrown()).toBeUndefined()
    expect(mounted.text()).toBe('routed page')
  })

  it('throws a translatable error naming the fix when the bond has no routed view', () => {
    const router = createMemoryRouter()
    const mounted = mountUnder({ router }, () => h(RoutedView))
    const thrown = mounted.thrown()
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('vue.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/pass the page as children/)
  })

  it('names the fix when a routing hook runs with no router', () => {
    const NoRouter = defineComponent({
      setup() {
        useRouterInstance()
        return () => null
      },
    })
    const thrown = mountCatching(NoRouter).thrown()
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('vue.error.useRouterOutsideProvider')
    expect((thrown as Error).message).toMatch(/routing bond/)
  })
})
