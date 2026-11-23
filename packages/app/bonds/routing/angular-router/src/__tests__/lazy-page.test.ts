// @vitest-environment jsdom
/**
 * The React bond's `lazy-page` titles, ported to Angular Router. Every title drives the
 * port's real native router: a real Angular application (`createApplication` plus
 * `provideRouter`) on the browser location, with the pages on Angular's own route table
 * and NO molecule provider, exactly as React's titles need none.
 *
 * Where a title's body names a React-only thing, a one-line comment says what the port's
 * test does instead.
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  DestroyRef,
  inject,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { type Route, RouterLink, RouterOutlet, RoutesRecognized } from '@angular/router'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'

import { useMoleculeRouter } from '../hooks.js'
import { lazyPage } from '../lazy-page.js'
import { bootApp, type BootAppOptions, type BootedApp, tick } from './angular-app.js'

let app: BootedApp | undefined
let bareApp: ApplicationRef | undefined
let host: HTMLElement
let fallbackRenders = 0

beforeEach(() => {
  fallbackRenders = 0
})

afterEach(() => {
  bareApp?.destroy()
  bareApp = undefined
  app?.teardown()
  app = undefined
})

/** A routed page that shows the feed. */
const Feed: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-feed',
  standalone: true,
  imports: [RouterLink],
  template: `<main><h1>Feed</h1><h1>First article</h1><h1>Second article</h1><a routerLink="/article/first">Open first</a></main>`,
})(class FeedComponent {})

/** A routed page that shows the article. */
const Article: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-article',
  standalone: true,
  imports: [RouterLink],
  template: `<article><h1>The article</h1><a routerLink="/">Back to feed</a></article>`,
})(class ArticleComponent {})

/** The layout route's page: a shell around the router's outlet. */
const Shell: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<div><nav data-shell>shell</nav><router-outlet /></div>',
})(class ShellComponent {})

/** The URL the app reports, beside the routes and outside the page's own area. */
const Path: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-path',
  standalone: true,
  template: '<output data-path>{{ path() }}</output>',
})(
  class PathComponent {
    private readonly router = useMoleculeRouter()
    readonly path = signal(this.router.getLocation().pathname)
    constructor() {
      const stop = this.router.subscribe(() => this.path.set(this.router.getLocation().pathname))
      inject(DestroyRef).onDestroy(stop)
    }
  },
)

/** What the page's area shows while its code loads. */
const Fallback: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-fallback',
  standalone: true,
  template: '<p data-fallback>loading</p>',
})(
  class FallbackComponent {
    constructor() {
      // Counts committed fallbacks, which is what 'no fallback flash' means.
      fallbackRenders += 1
    }
  },
)

/** The bootstrap root: the URL, then the routes. */
const Root: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-lazy-root',
  standalone: true,
  imports: [Path, RouterOutlet],
  template: '<mol-test-path></mol-test-path><router-outlet />',
})(class RootComponent {})

/** A page module whose code arrives only when `resolve` (or `arrive`) is called. */
function pendingModule(page: Type<unknown>): {
  load: () => Promise<{ default: Type<unknown> }>
  component: () => Promise<Type<unknown>>
  resolve: () => void
  arrive: (booted: BootedApp) => Promise<void>
} {
  let deliver: (page: Type<unknown>) => void = () => undefined
  const loaded = new Promise<Type<unknown>>((done) => {
    deliver = done
  })
  return {
    load: () => loaded.then((arrived) => ({ default: arrived })),
    component: () => loaded,
    resolve: () => deliver(page),
    arrive: async (booted) => {
      deliver(page)
      await booted.settle()
    },
  }
}

const headings = (element: HTMLElement = host): (string | null)[] =>
  [...element.querySelectorAll('h1')].map((heading) => heading.textContent)
const path = (): string | null | undefined => host.querySelector('[data-path]')?.textContent

/** Boots the app into a fresh host element and keeps it for the DOM helpers. */
async function boot(options: BootAppOptions = {}): Promise<BootedApp> {
  const hostElement = document.createElement('mol-test-lazy-root')
  document.body.append(hostElement)
  const booted = await bootApp({ root: Root, hostElement, ...options })
  app = booted
  host = booted.host
  return booted
}

async function click(text: string, booted: BootedApp): Promise<void> {
  const link = [...host.querySelectorAll('a')].find((anchor) => anchor.textContent === text)
  if (!link) throw new Error(`no link "${text}"`)
  link.click()
  await booted.settle()
}

/** The route table: a shell around the feed and the article, as React's nested routes. */
function routes(feedPage: Type<unknown>, articlePage: Type<unknown>): Route[] {
  return [
    {
      path: '',
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
    const booted = await boot({ routes: routes(FeedPage, ArticlePage), initialPath: '/' })
    await feed.arrive(booted)
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    const shell = host.querySelector('[data-shell]')

    await click('Open first', booted)

    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    expect(host.querySelector('[data-fallback]')).not.toBeNull()
    // The layout route around <router-outlet> is the same element, not a re-created one.
    expect(host.querySelector('[data-shell]')).toBe(shell)

    await article.arrive(booted)

    expect(headings()).toEqual(['The article'])
    expect(host.querySelector('[data-fallback]')).toBeNull()
  })

  it('also holds when React Router runs navigations as transitions', async () => {
    // The title keeps React's words. Angular's counterpart of React Router running a
    // navigation as a transition is `urlUpdateStrategy: 'eager'`, which writes the URL
    // before the route activates: the body pushes under it, and the previous page leaves.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load)
    const ArticlePage = lazyPage(article.load)
    const booted = await boot({
      routes: routes(FeedPage, ArticlePage),
      routerConfig: { urlUpdateStrategy: 'eager' },
      initialPath: '/',
    })
    // Eager really is on: the browser URL already carries the new page when the router
    // recognizes the routes, before the route activates.
    let urlLeads = false
    booted.router.events.subscribe((event) => {
      if (event instanceof RoutesRecognized)
        urlLeads = window.location.pathname === '/article/first'
    })
    await feed.arrive(booted)

    await click('Open first', booted)

    expect(urlLeads).toBe(true)
    expect(path()).toBe('/article/first')
    expect(headings()).toEqual([])
    await article.arrive(booted)
    expect(headings()).toEqual(['The article'])
  })

  it('shows no fallback when navigating to a page whose code has already loaded', async () => {
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    const FeedPage = lazyPage(feed.load, { fallback: Fallback })
    const ArticlePage = lazyPage(article.load, { fallback: Fallback })
    const booted = await boot({ routes: routes(FeedPage, ArticlePage), initialPath: '/' })
    await feed.arrive(booted)
    await click('Open first', booted)
    await article.arrive(booted)
    const before = fallbackRenders

    await click('Back to feed', booted)

    expect(path()).toBe('/')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    expect(fallbackRenders).toBe(before)
  })

  it('counterexample: React.lazy under one shared boundary keeps the previous page in the DOM', async () => {
    // The title keeps React's words. Angular's `React.lazy` is a route's `loadComponent`,
    // which the router awaits after guards and resolvers and before activating. Back has
    // already moved the browser to the new URL, so the previous page stays under it.
    const feed = pendingModule(Feed)
    const article = pendingModule(Article)
    feed.resolve()
    // The Back target, behind the entry the app boots on.
    window.history.replaceState(null, '', '/article/first')
    window.history.pushState(null, '', '/')
    const booted = await boot({
      routes: [
        {
          path: '',
          component: Shell,
          children: [
            { path: '', loadComponent: feed.component },
            { path: 'article/:slug', loadComponent: article.component },
          ],
        },
      ],
      initialPath: '/',
    })
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])

    booted.location.historyGo(-1)
    for (
      let round = 0;
      round < 50 &&
      (window.location.pathname !== '/article/first' ||
        booted.router.getCurrentNavigation() === null);
      round += 1
    ) {
      await tick()
    }

    // The URL names the article while the feed's three headings are still mounted:
    // the strict `locator('h1')` failure. The article's code being awaited is what holds
    // them, so the navigation is in flight, not merely queued in the browser.
    expect(window.location.pathname).toBe('/article/first')
    expect(booted.router.getCurrentNavigation()).not.toBeNull()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
  })
})

/** The props {@link lazyPage}'s component declares, as its `props` input takes them. */
type PropsOf<ComponentType> =
  ComponentType extends Type<infer Instance>
    ? Instance extends { props: infer Props }
      ? Props
      : never
    : never

/** A function taking exactly `Props`, for checking which prop objects a page accepts. */
const acceptsProps = <Props>(props: Props): Props => props

describe('lazyPage types', () => {
  it('keeps the loaded page props, including for a page that takes none', () => {
    const About = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-about',
      standalone: true,
      template: '<p>about</p>',
    })(class AboutComponent {})
    const Post = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-post',
      standalone: true,
      inputs: ['slug'],
      template: '<p>{{ slug }}</p>',
    })(
      class PostComponent {
        slug = ''
      },
    )
    const pages = async (): Promise<{ About: typeof About; Post: typeof Post }> => ({
      About,
      Post,
    })
    const AboutPage = lazyPage(() => pages().then((m) => ({ default: m.About })))
    const PostPage = lazyPage(() => pages().then((m) => ({ default: m.Post })))
    // Both are route components: the port's whole contract is a route's `component`.
    const pageRoutes: Route[] = [
      { path: '', component: AboutPage },
      { path: ':slug', component: PostPage },
    ]
    expect(pageRoutes.map((route) => route.component)).toEqual([AboutPage, PostPage])

    expectTypeOf<PropsOf<typeof AboutPage>>().toEqualTypeOf<Record<never, never>>()
    expectTypeOf<PropsOf<typeof PostPage>>().toEqualTypeOf<{ slug: string }>()
    // A required page prop stays required: no props at all do not satisfy the page.
    expectTypeOf<Record<never, never>>().not.toExtend<PropsOf<typeof PostPage>>()
  })

  it('accepts a page whose props parameter is optional, with or without its props', async () => {
    // React's `function Draft({ initial }: { initial?: string } = {})` is an Angular page
    // whose `initial` input is optional.
    const Draft = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-draft',
      standalone: true,
      inputs: ['initial'],
      template: '<h1>{{ initial ?? "empty draft" }}</h1>',
    })(
      class DraftComponent {
        initial?: string
      },
    )
    const DraftPage = lazyPage(async () => ({ default: Draft }))

    // `undefined` in the props type makes the page an invalid React element type wherever
    // React's types come from a second copy; Angular's counterpart check is that the props
    // are the page's fields exactly as it declares them.
    expectTypeOf<PropsOf<typeof DraftPage>>().toEqualTypeOf<{ initial?: string }>()
    expectTypeOf(acceptsProps<PropsOf<typeof DraftPage>>).toBeCallableWith({
      initial: 'saved',
    })
    expectTypeOf(acceptsProps<PropsOf<typeof DraftPage>>).toBeCallableWith({})
    // A prop the page does not declare is still refused.
    expectTypeOf<{ title: string }>().not.toExtend<PropsOf<typeof DraftPage>>()

    bareApp = await createApplication({ providers: [provideZonelessChangeDetection()] })
    const hostElement = document.createElement('div')
    document.body.append(hostElement)
    const ref = createComponent(DraftPage, {
      environmentInjector: bareApp.injector,
      hostElement,
    })
    ref.setInput('props', { initial: 'saved' })
    ref.changeDetectorRef.detectChanges()
    await tick()
    ref.changeDetectorRef.detectChanges()
    expect(headings(hostElement)).toEqual(['saved'])
    ref.destroy()
    hostElement.remove()
  })
})
