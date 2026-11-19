// @vitest-environment jsdom

import { A, MemoryRouter, Route, type RouteSectionProps, useLocation } from '@solidjs/router'
import { type Component, type ComponentProps, type JSX, lazy, onMount, Suspense } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'

import { lazyPage } from '../lazy-page.jsx'
import { createSolidMemoryHistory } from '../memory-history.js'
import type { SolidMemoryHistory } from '../types.js'

let host: HTMLDivElement
let dispose: (() => void) | undefined
let fallbackRenders = 0

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  fallbackRenders = 0
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  host.remove()
})

function Feed(): JSX.Element {
  return (
    <main>
      <h1>Feed</h1>
      <h1>First article</h1>
      <h1>Second article</h1>
      <A href="/article/first">Open first</A>
    </main>
  )
}

function Article(): JSX.Element {
  return (
    <article>
      <h1>The article</h1>
      <A href="/">Back to feed</A>
    </article>
  )
}

function Shell(props: { children?: JSX.Element }): JSX.Element {
  return (
    <div>
      <nav data-shell="">shell</nav>
      {props.children}
    </div>
  )
}

function Path(): JSX.Element {
  return <output data-path="">{useLocation().pathname}</output>
}

function Fallback(): JSX.Element {
  // Counts committed fallbacks, which is what 'no fallback flash' means.
  onMount(() => {
    fallbackRenders += 1
  })
  return <p data-fallback="">loading</p>
}

/** A page module whose code arrives only when `arrive` is called. */
function pendingModule(page: Component): {
  load: () => Promise<{ default: Component }>
  arrive: () => Promise<void>
} {
  let resolve: (module: { default: Component }) => void = () => undefined
  const loaded = new Promise<{ default: Component }>((done) => {
    resolve = done
  })
  return {
    load: () => loaded,
    arrive: async () => {
      resolve({ default: page })
      await settle()
    },
  }
}

const headings = (): (string | null)[] =>
  [...host.querySelectorAll('h1')].map((heading) => heading.textContent)
const path = (): string | null | undefined => host.querySelector('[data-path]')?.textContent

/** Flushes macrotasks so a navigation in flight has committed. */
const flush = (): Promise<unknown> => new Promise((done) => setTimeout(done, 0))

/** Waits until the router has committed everything it can without new code. */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await flush()
}

function mount(
  history: SolidMemoryHistory,
  feedPage: Component<RouteSectionProps<unknown>>,
  articlePage: Component<RouteSectionProps<unknown>>,
): void {
  dispose = render(
    () => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <>
            <Path />
            <Suspense fallback={<Fallback />}>{props.children}</Suspense>
          </>
        )}
      >
        <Route path="/" component={Shell}>
          <Route path="/" component={feedPage} />
          <Route path="/article/:slug" component={articlePage} />
        </Route>
      </MemoryRouter>
    ),
    host,
  )
}

async function click(text: string): Promise<void> {
  const link = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === text)
  if (!link) throw new Error(`no link "${text}"`)
  link.click()
  await settle()
}

describe('lazyPage', () => {
  it('removes the previous page as soon as the URL names a page whose code is still loading', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, {
      get fallback() {
        return <Fallback />
      },
    })
    const ArticlePage = lazyPage(article.load, {
      get fallback() {
        return <Fallback />
      },
    })
    // Back onto a route this document has not loaded: the URL moves first.
    const history = createSolidMemoryHistory(['/article/first', '/'])
    mount(history, FeedPage, ArticlePage)
    await feed.arrive()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    const shell = host.querySelector('[data-shell]')

    history.back()
    await settle()

    expect(history.get()).toBe('/article/first')
    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    expect(host.querySelector('[data-fallback]')).not.toBeNull()
    // The layout route around the outlet is the same element, not a remount.
    expect(host.querySelector('[data-shell]')).toBe(shell)

    await article.arrive()

    expect(headings()).toEqual(['The article'])
    expect(host.querySelector('[data-fallback]')).toBeNull()
  })

  it('also holds when React Router runs navigations as transitions', async () => {
    // The title keeps React's words. Solid Router wraps every navigation of its own in a
    // transition, and the body drives a push through it: the URL moves and the previous
    // page leaves even while the new page's code is still loading.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load)
    const ArticlePage = lazyPage(article.load)
    const history = createSolidMemoryHistory(['/'])
    mount(history, FeedPage, ArticlePage)
    await feed.arrive()

    await click('Open first')

    expect(history.get()).toBe('/article/first')
    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    await article.arrive()
    expect(headings()).toEqual(['The article'])
  })

  it('shows no fallback when navigating to a page whose code has already loaded', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, {
      get fallback() {
        return <Fallback />
      },
    })
    const ArticlePage = lazyPage(article.load, {
      get fallback() {
        return <Fallback />
      },
    })
    const history = createSolidMemoryHistory(['/'])
    mount(history, FeedPage, ArticlePage)
    await feed.arrive()
    await click('Open first')
    await article.arrive()
    const before = fallbackRenders

    await click('Back to feed')

    expect(history.get()).toBe('/')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    expect(fallbackRenders).toBe(before)
  })

  it('counterexample: React.lazy under one shared boundary keeps the previous page in the DOM', async () => {
    // The title keeps React's words. The body uses Solid's `lazy` under the shared
    // `<Suspense>` and Backs onto a route this document has not loaded: because the
    // shared boundary has resolved, Solid Router's transition holds the previous page
    // while the URL already names the new one.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazy(feed.load)
    const ArticlePage = lazy(article.load)
    // The shared boundary has resolved for the feed; Back onto the article holds it.
    const history = createSolidMemoryHistory(['/article/first', '/'])
    mount(history, FeedPage, ArticlePage)
    await feed.arrive()

    history.back()
    await settle()

    // The URL names the article while the feed's three headings are still mounted:
    // the strict `locator('h1')` failure.
    expect(history.get()).toBe('/article/first')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
  })
})

describe('lazyPage types', () => {
  it('keeps the loaded page props, including for a page that takes none', () => {
    function About(): JSX.Element {
      return <p>about</p>
    }
    function Post(props: { slug: string }): JSX.Element {
      return <p>{props.slug}</p>
    }
    const pages = async (): Promise<{ About: typeof About; Post: typeof Post }> => ({
      About,
      Post,
    })
    const AboutPage = lazyPage(() => pages().then((m) => ({ default: m.About })))
    const PostPage = lazyPage(() => pages().then((m) => ({ default: m.Post })))

    // Solid's JSX runs when it is written, so each element is created inside a thunk:
    // the assertion reads the expression's type without mounting it.
    expectTypeOf(() => <AboutPage />).toEqualTypeOf<() => JSX.Element>()
    expectTypeOf(() => <PostPage slug="first" />).toEqualTypeOf<() => JSX.Element>()
    // A required page prop stays required.
    expectTypeOf<ComponentProps<typeof PostPage>>().toEqualTypeOf<{ slug: string }>()
  })

  it('accepts a page whose props parameter is optional, with or without its props', async () => {
    function Draft(props: { initial?: string } = {}): JSX.Element {
      return <h1>{props.initial ?? 'empty draft'}</h1>
    }
    const DraftPage = lazyPage(async () => ({ default: Draft }))

    // `undefined` in the props type makes the page an invalid JSX element type.
    expectTypeOf<ComponentProps<typeof DraftPage>>().toEqualTypeOf<{ initial?: string }>()
    expectTypeOf(() => <DraftPage />).toEqualTypeOf<() => JSX.Element>()
    expectTypeOf(() => <DraftPage initial="saved" />).toEqualTypeOf<() => JSX.Element>()

    dispose = render(() => <DraftPage initial="saved" />, host)
    await settle()
    expect(headings()).toEqual(['saved'])
  })
})
