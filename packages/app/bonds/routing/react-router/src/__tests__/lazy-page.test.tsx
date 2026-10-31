// @vitest-environment jsdom

import { expectTypeOf } from 'expect-type'
import { act, type ComponentType, type JSX, lazy, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  Link,
  MemoryRouter as ReactRouterMemoryRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { lazyPage } from '../lazyPage.js'
import { MemoryRouter } from '../routers.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let host: HTMLDivElement
let fallbackRenders = 0

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  fallbackRenders = 0
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host.remove()
})

function Feed(): JSX.Element {
  return (
    <main>
      <h1>Feed</h1>
      <h1>First article</h1>
      <h1>Second article</h1>
      <Link to="/article/first">Open first</Link>
    </main>
  )
}

function Article(): JSX.Element {
  return (
    <article>
      <h1>The article</h1>
      <Link to="/">Back to feed</Link>
    </article>
  )
}

function Shell(): JSX.Element {
  return (
    <div>
      <nav data-shell="">shell</nav>
      <Outlet />
    </div>
  )
}

function Path(): JSX.Element {
  return <output data-path="">{useLocation().pathname}</output>
}

function Fallback(): JSX.Element {
  fallbackRenders += 1
  return <p data-fallback="">loading</p>
}

/** A page module whose code arrives only when `arrive` is called. */
function pendingModule(page: ComponentType): {
  load: () => Promise<{ default: ComponentType }>
  arrive: () => Promise<void>
} {
  let resolve: (module: { default: ComponentType }) => void = () => undefined
  const loaded = new Promise<{ default: ComponentType }>((done) => {
    resolve = done
  })
  return {
    load: () => loaded,
    arrive: async () => {
      await act(async () => resolve({ default: page }))
    },
  }
}

const headings = (): (string | null)[] =>
  [...host.querySelectorAll('h1')].map((heading) => heading.textContent)
const path = (): string | null | undefined => host.querySelector('[data-path]')?.textContent

async function render(app: JSX.Element): Promise<void> {
  await act(async () => {
    root = createRoot(host)
    root.render(app)
  })
}

async function click(text: string): Promise<void> {
  const link = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === text)
  if (!link) throw new Error(`no link "${text}"`)
  await act(async () => link.click())
}

function routes(feedPage: ComponentType, articlePage: ComponentType): JSX.Element {
  const FeedPage = feedPage
  const ArticlePage = articlePage
  return (
    <>
      <Path />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

describe('lazyPage', () => {
  it('removes the previous page as soon as the URL names a page whose code is still loading', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, { fallback: <Fallback /> })
    const ArticlePage = lazyPage(article.load, { fallback: <Fallback /> })
    await render(
      <MemoryRouter initialEntries={['/']}>{routes(FeedPage, ArticlePage)}</MemoryRouter>,
    )
    await feed.arrive()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    const shell = host.querySelector('[data-shell]')

    await click('Open first')

    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    expect(host.querySelector('[data-fallback]')).not.toBeNull()
    // The layout route around <Outlet /> is the same element, not a remount.
    expect(host.querySelector('[data-shell]')).toBe(shell)

    await article.arrive()

    expect(headings()).toEqual(['The article'])
    expect(host.querySelector('[data-fallback]')).toBeNull()
  })

  it('also holds when React Router runs navigations as transitions', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load)
    const ArticlePage = lazyPage(article.load)
    await render(
      <ReactRouterMemoryRouter initialEntries={['/']}>
        {routes(FeedPage, ArticlePage)}
      </ReactRouterMemoryRouter>,
    )
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
    const FeedPage = lazyPage(feed.load, { fallback: <Fallback /> })
    const ArticlePage = lazyPage(article.load, { fallback: <Fallback /> })
    await render(
      <MemoryRouter initialEntries={['/']}>{routes(FeedPage, ArticlePage)}</MemoryRouter>,
    )
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
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazy(feed.load)
    const ArticlePage = lazy(article.load)
    await render(
      <MemoryRouter initialEntries={['/']}>{routes(FeedPage, ArticlePage)}</MemoryRouter>,
    )
    await feed.arrive()

    await click('Open first')

    // The URL names the article while the feed's three headings are still mounted
    // (hidden behind the shared fallback): the strict `locator('h1')` failure.
    expect(path()).toBe('/article/first')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
  })
})

describe('lazyPage types', () => {
  it('keeps the loaded page props, including for a page that takes none', () => {
    function About(): JSX.Element {
      return <p>about</p>
    }
    function Post({ slug }: { slug: string }): JSX.Element {
      return <p>{slug}</p>
    }
    const pages = async (): Promise<{ About: typeof About; Post: typeof Post }> => ({
      About,
      Post,
    })
    const AboutPage = lazyPage(() => pages().then((m) => ({ default: m.About })))
    const PostPage = lazyPage(() => pages().then((m) => ({ default: m.Post })))

    expectTypeOf(<AboutPage />).toEqualTypeOf<JSX.Element>()
    expectTypeOf(<PostPage slug="first" />).toEqualTypeOf<JSX.Element>()
    // @ts-expect-error -- a required page prop stays required.
    expectTypeOf(<PostPage />).toEqualTypeOf<JSX.Element>()
  })
})
