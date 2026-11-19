// @vitest-environment jsdom
/**
 * The React bond's `lazy-page` titles, ported to Vue Router. Every title drives the
 * port's real native router: a REAL Vue Router over `createMemoryHistory()` with the app
 * mounted on it and NO molecule provider, exactly as React's titles need none.
 *
 * Where a title's body names a React-only thing, a one-line comment says what the port's
 * test does instead.
 */
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import {
  type App,
  type Component,
  createApp,
  defineAsyncComponent,
  defineComponent,
  Fragment,
  h,
  onMounted,
  type PublicProps,
  Suspense,
  type VNode,
} from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  RouterLink,
  RouterView,
  useRoute,
} from 'vue-router'

import { lazyPage } from '../lazyPage.js'
import { settle } from './routing-harness.js'

let app: App | undefined
let host: HTMLDivElement
let fallbackRenders = 0

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  fallbackRenders = 0
})

afterEach(() => {
  app?.unmount()
  app = undefined
  host.remove()
})

function Feed(): VNode {
  return h('main', [
    h('h1', 'Feed'),
    h('h1', 'First article'),
    h('h1', 'Second article'),
    h(RouterLink, { to: '/article/first' }, () => 'Open first'),
  ])
}

function Article(): VNode {
  return h('article', [h('h1', 'The article'), h(RouterLink, { to: '/' }, () => 'Back to feed')])
}

const Shell = defineComponent({
  setup: () => (): VNode => h('div', [h('nav', { 'data-shell': '' }, 'shell'), h(RouterView)]),
})

const Path = defineComponent({
  setup() {
    const route = useRoute()
    return (): VNode => h('output', { 'data-path': '' }, route.path)
  },
})

const Fallback = defineComponent({
  setup() {
    // Counts committed fallbacks, which is what 'no fallback flash' means.
    onMounted(() => {
      fallbackRenders += 1
    })
    return (): VNode => h('p', { 'data-fallback': '' }, 'loading')
  },
})

/** A page module whose code arrives only when `arrive` is called. */
function pendingModule(page: Component): {
  load: () => Promise<{ default: Component }>
  loadComponent: () => Promise<Component>
  arrive: () => Promise<void>
} {
  let resolve: (page: Component) => void = () => undefined
  const loaded = new Promise<Component>((done) => {
    resolve = done
  })
  return {
    load: () => loaded.then((arrived) => ({ default: arrived })),
    loadComponent: () => loaded,
    arrive: async () => {
      resolve(page)
      await settle()
    },
  }
}

const headings = (): (string | null)[] =>
  [...host.querySelectorAll('h1')].map((heading) => heading.textContent)
const path = (): string | null | undefined => host.querySelector('[data-path]')?.textContent

/**
 * Mounts the app: `<Path />` beside one shared `<Suspense>` whose content is `page`.
 *
 * @param records - The router's records.
 * @param initial - The address the router opens on.
 * @param page - The shared boundary's content. Defaults to the router's view.
 */
async function mount(
  records: RouteRecordRaw[],
  initial: string,
  page: () => VNode = () => h(RouterView),
): Promise<void> {
  const vueRouter = createRouter({ history: createMemoryHistory(), routes: records })
  await vueRouter.replace(initial)
  await vueRouter.isReady()
  app = createApp({
    render: (): VNode =>
      h(Fragment, [
        h(Path),
        h(Suspense, null, {
          default: page,
          fallback: () => h(Fallback),
        }),
      ]),
  })
  app.use(vueRouter)
  app.mount(host)
  await settle()
}

async function click(text: string): Promise<void> {
  const link = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === text)
  if (!link) throw new Error(`no link "${text}"`)
  link.click()
  await settle()
}

function routes(feedPage: Component, articlePage: Component): RouteRecordRaw[] {
  return [
    {
      path: '/',
      component: Shell,
      children: [
        { path: '', component: feedPage },
        { path: 'article/:slug', component: articlePage },
      ],
    },
  ]
}

describe('lazyPage', () => {
  it('removes the previous page as soon as the URL names a page whose code is still loading', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, { fallback: Fallback })
    const ArticlePage = lazyPage(article.load, { fallback: Fallback })
    await mount(routes(FeedPage, ArticlePage), '/')
    await feed.arrive()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    const shell = host.querySelector('[data-shell]')

    await click('Open first')

    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    expect(host.querySelector('[data-fallback]')).not.toBeNull()
    // The layout route around <RouterView> is the same element, not a remount.
    expect(host.querySelector('[data-shell]')).toBe(shell)

    await article.arrive()

    expect(headings()).toEqual(['The article'])
    expect(host.querySelector('[data-fallback]')).toBeNull()
  })

  it('also holds when React Router runs navigations as transitions', async () => {
    // Vue Router has no transitions switch: it writes history and the matched component
    // together. The one thing that could hold the previous page here is the shared
    // <Suspense> around <RouterView>, so this title mounts it and shows it does not.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load)
    const ArticlePage = lazyPage(article.load)
    await mount(routes(FeedPage, ArticlePage), '/')
    await feed.arrive()

    await click('Open first')

    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    await article.arrive()
    expect(headings()).toEqual(['The article'])
  })

  it('shows no fallback when navigating to a page whose code has already loaded', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, { fallback: Fallback })
    const ArticlePage = lazyPage(article.load, { fallback: Fallback })
    await mount(routes(FeedPage, ArticlePage), '/')
    await feed.arrive()
    await click('Open first')
    await article.arrive()
    const before = fallbackRenders

    await click('Back to feed')

    expect(path()).toBe('/')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    expect(fallbackRenders).toBe(before)
  })

  it('counterexample: React.lazy under one shared boundary keeps the previous page in the DOM', async () => {
    // Vue's `React.lazy` is `defineAsyncComponent` (suspensible by default). The boundary
    // must own the page swap for the old page to stay: a suspending page mounted inside
    // <RouterView> is unmounted there before the boundary sees it, so this title renders
    // the router's matched page as the shared <Suspense>'s own content instead.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = defineAsyncComponent(feed.loadComponent)
    const ArticlePage = defineAsyncComponent(article.loadComponent)
    /** The matched page, read from the router: the boundary's content. */
    const Page = defineComponent({
      setup() {
        const route = useRoute()
        return (): VNode =>
          h(Suspense, null, {
            default: () => (route.path === '/' ? h(FeedPage) : h(ArticlePage)),
            fallback: () => h(Fallback),
          })
      },
    })
    await mount(routes(FeedPage, ArticlePage), '/', () => h(Page))
    await feed.arrive()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])

    await click('Open first')

    // The URL names the article while the feed's three headings are still mounted, with
    // no fallback: the strict `locator('h1')` failure.
    expect(path()).toBe('/article/first')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
  })
})

/** The props a component declares, as `h()` reads them (Vue has no `ComponentProps`). */
type PropsOf<C> = C extends (props: infer P, ...args: never[]) => unknown
  ? P
  : C extends new (...args: never[]) => { $props: infer P }
    ? Omit<P, keyof PublicProps>
    : never

describe('lazyPage types', () => {
  it('keeps the loaded page props, including for a page that takes none', () => {
    const About = defineComponent({
      setup: () => (): VNode => h('p', 'about'),
    })
    const Post = defineComponent({
      props: { slug: { type: String, required: true } },
      setup: (props) => (): VNode => h('p', props.slug),
    })
    const pages = async (): Promise<{ About: typeof About; Post: typeof Post }> => ({
      About,
      Post,
    })
    const AboutPage = lazyPage(() => pages().then((m) => ({ default: m.About })))
    const PostPage = lazyPage(() => pages().then((m) => ({ default: m.Post })))

    expectTypeOf(h(AboutPage)).toEqualTypeOf<VNode>()
    expectTypeOf(h(PostPage, { slug: 'first' })).toEqualTypeOf<VNode>()
    expectTypeOf<PropsOf<typeof AboutPage>>().toEqualTypeOf<Pick<unknown, never>>()
    // A required page prop stays required.
    expectTypeOf<PropsOf<typeof PostPage>>().toEqualTypeOf<{ readonly slug: string }>()
    expectTypeOf<Pick<unknown, never>>().not.toExtend<PropsOf<typeof PostPage>>()
  })

  it('accepts a page whose props parameter is optional, with or without its props', async () => {
    // React's `function Draft({ initial }: { initial?: string } = {})` is a Vue component
    // that declares `initial` optional.
    const Draft = defineComponent({
      props: { initial: { type: String } },
      setup: (props) => (): VNode => h('h1', props.initial ?? 'empty draft'),
    })
    const DraftPage = lazyPage(async () => ({ default: Draft }))

    expectTypeOf<PropsOf<typeof DraftPage>>().toEqualTypeOf<{ readonly initial?: string }>()
    expectTypeOf(h(DraftPage)).toEqualTypeOf<VNode>()
    expectTypeOf(h(DraftPage, { initial: 'saved' })).toEqualTypeOf<VNode>()

    app = createApp({ render: (): VNode => h(DraftPage, { initial: 'saved' }) })
    app.mount(host)
    await settle()
    expect(headings()).toEqual(['saved'])
  })
})
