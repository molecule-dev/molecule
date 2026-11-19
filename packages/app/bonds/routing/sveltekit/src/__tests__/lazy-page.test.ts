// @vitest-environment jsdom
/**
 * The React bond's `lazy-page` titles, ported to SvelteKit. React's `lazyPage` wraps a
 * route's element in a Suspense boundary of its own; a SvelteKit page cannot be wrapped
 * from a package (kit mounts pages from files), so its Svelte form is a page that renders
 * its component from a memoized loaded-page store and its own fallback until it arrives —
 * `kit-app/src/routes/probe-lazy/feed/+page.svelte` and `.../article/[slug]/+page.svelte`.
 * The counterexample's `React.lazy` counterpart is kit's own lazy route loading: a
 * `+page.ts` load that has not answered keeps the previous page mounted (and, unlike
 * React's shared boundary, kit moves the URL and the page together — the conformance suite
 * pins that), which the case shows before it releases the load.
 */
import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'

import Draft from './kit-app/src/lib/Draft.svelte'
import {
  armSlowLoad,
  arrivePage,
  fallbackRenders,
  releaseSlowLoad,
  resetLazyPages,
} from './kit-app/src/lib/lazy.js'
import type { DraftProps, EmptyPageProps, PostProps } from './kit-app/src/lib/page-props.js'
import { awaitNavigation, documentUrl, inAppPath, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

const headings = (): (string | null)[] =>
  [...(container?.querySelectorAll('h1') ?? [])].map((heading) => heading.textContent)
const path = (): string | null | undefined => container?.querySelector('[data-path]')?.textContent

/** Lets queued tasks and render flushes run. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await new Promise((done) => setTimeout(done, 0))
}

/** Waits until kit finished every navigation it started. */
const idle = async (): Promise<void> => {
  if (!kit) throw new Error('no started app')
  for (let i = 0; i < 500 && !kit.app.idle(); i++) await new Promise((done) => setTimeout(done, 0))
  await flush()
}

/**
 * Starts the test app at `initial` with fresh loaded-page state and, when given, an armed
 * slow route load.
 *
 * @param initial - The in-app address kit opens on.
 * @param slow - Whether the slow route's load waits for {@link releaseSlowLoad}.
 */
async function open(initial: string, slow = false): Promise<void> {
  resetLazyPages()
  if (slow) armSlowLoad()
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await idle()
}

/** Click a link by its text and let kit commit the navigation it starts. */
async function click(text: string): Promise<void> {
  if (!kit) throw new Error('no started app')
  const link = [...(container?.querySelectorAll('a') ?? [])].find(
    (anchor) => anchor.textContent === text,
  )
  if (!link) throw new Error(`no link "${text}"`)
  await awaitNavigation(kit.app, () => link.click())
  await idle()
}

/** Click a link whose navigation the slow route holds open. */
async function clickSlow(text: string): Promise<void> {
  const link = [...(container?.querySelectorAll('a') ?? [])].find(
    (anchor) => anchor.textContent === text,
  )
  if (!link) throw new Error(`no link "${text}"`)
  link.click()
  await flush()
}

describe('lazyPage', () => {
  it('removes the previous page as soon as the URL names a page whose code is still loading', async () => {
    await open('/probe-lazy/feed')
    arrivePage('feed')
    await flush()
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    const shell = container!.querySelector('[data-shell]')

    await click('Open first')

    expect(path()).toBe('/probe-lazy/article/first')
    expect(headings()).toEqual([])
    expect(container!.querySelector('[data-fallback]')).not.toBeNull()
    // The layout around the page is the same element, not a remount.
    expect(container!.querySelector('[data-shell]')).toBe(shell)

    arrivePage('article')
    await flush()

    expect(headings()).toEqual(['The article'])
    expect(container!.querySelector('[data-fallback]')).toBeNull()
  })

  it('also holds when React Router runs navigations as transitions', async () => {
    // Kit has no transitions switch: it moves history and the matched page together. The
    // one thing that could keep the previous page here is the page's own loaded-code state,
    // so this title mounts it and shows the previous page still goes at once.
    await open('/probe-lazy/feed')
    arrivePage('feed')
    await flush()

    await click('Open first')

    expect(path()).toBe('/probe-lazy/article/first')
    expect(headings()).toEqual([])
    arrivePage('article')
    await flush()
    expect(headings()).toEqual(['The article'])
  })

  it('shows no fallback when navigating to a page whose code has already loaded', async () => {
    await open('/probe-lazy/feed')
    arrivePage('feed')
    await flush()
    await click('Open first')
    arrivePage('article')
    await flush()
    const before = fallbackRenders()

    await click('Back to feed')

    expect(path()).toBe('/probe-lazy/feed')
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    expect(fallbackRenders()).toBe(before)
  })

  it('counterexample: React.lazy under one shared boundary keeps the previous page in the DOM', async () => {
    await open('/probe-lazy/slow-feed', true)
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])

    await clickSlow('Open first')

    // kit has not committed the article yet: its own lazy route load is still running, and
    // the feed's three headings are still mounted (with the URL and the page moving
    // together, so the failure React's shared boundary shows is a page still there).
    expect(headings()).toEqual(['Feed', 'First article', 'Second article'])
    expect(inAppPath()).not.toBe('/probe-lazy/slow-article/first')

    await awaitNavigation(kit!.app, () => {
      releaseSlowLoad()
    })
    await idle()

    expect(headings()).toEqual(['The article'])
    expect(inAppPath()).toBe('/probe-lazy/slow-article/first')
  })
})

describe('lazyPage types', () => {
  it('keeps the loaded page props, including for a page that takes none', () => {
    // React's `function About(): JSX.Element` is the page that declares no props; its
    // `function Post({ slug })` one declares `slug`. Each page annotates its `$props()`
    // with one of these, so `svelte-check` holds the page to exactly this declaration.
    expectTypeOf<EmptyPageProps>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PostProps>().toEqualTypeOf<{ slug: string }>()
    // A required page prop stays required: a value without it is no page props at all.
    expectTypeOf<Record<string, never>>().not.toExtend<PostProps>()
  })

  it('accepts a page whose props parameter is optional, with or without its props', async () => {
    // React's `function Draft({ initial }: { initial?: string } = {})` is the page whose
    // `initial` prop is optional, and which declares nothing else.
    expectTypeOf<DraftProps>().toEqualTypeOf<{ initial?: string }>()

    const target = document.createElement('div')
    document.body.append(target)
    const empty = mount(Draft, { target })
    await flush()
    expect(target.querySelector('h1')?.textContent).toBe('empty draft')
    unmount(empty)
    const saved = mount(Draft, { target, props: { initial: 'saved' } })
    await flush()
    expect(target.querySelector('h1')?.textContent).toBe('saved')
    unmount(saved)
    target.remove()
  })
})
