// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `Carousel` — a port of
 * `@molecule/app-carousel-react/src/__tests__/carousel.test.tsx`: the same
 * behavioral assertions, rendered with Svelte in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `t(key, values, opts)` interpolates `{{name}}` into the supplied
// `defaultValue`, as the i18n core does.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

const { default: CarouselHost } = await import('./CarouselHost.svelte')
const { default: CarouselEachHost } = await import('./CarouselEachHost.svelte')

/**
 * Mounts {@link CarouselHost} — the carousel with a real children snippet — into
 * jsdom.
 *
 * @param props - The component props.
 * @param slides - How many slides the host renders.
 * @returns The rendered markup and the teardown.
 */
const html = (props: Record<string, unknown> = {}, slides = 0): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(CarouselHost, { target, props: { props, slides } })
  flushSync()
  return {
    markup: target.innerHTML,
    done: async () => {
      await unmount(instance)
      target.remove()
    },
  }
}

interface Mounted {
  /** The rendered markup. */
  markup: string
  /** Unmounts the component and removes its container. */
  done: () => Promise<void>
}

/**
 * Mounts {@link CarouselHost} into jsdom and keeps it live, so a test can
 * replace the slide list and read the markup again.
 *
 * @param props - The component props.
 * @param slides - How many slides the host renders first.
 * @returns The live view: the container, a slide-list setter, the markup and the teardown.
 */
const live = (props: Record<string, unknown> = {}, slides = 0): LiveView => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(CarouselHost, { target, props: { props, slides } }) as unknown as {
    setSlides(next: number[]): void
  }
  flushSync()
  return {
    target,
    setSlides: (next) => instance.setSlides(next),
    markup: () => target.innerHTML,
    done: async () => {
      await unmount(instance as never)
      target.remove()
    },
  }
}

interface LiveView {
  /** The container the carousel rendered into. */
  target: HTMLElement
  /** Replaces the slide list, as an app's own state update does. */
  setSlides: (next: number[]) => void
  /** The current markup. */
  markup: () => string
  /** Unmounts the component and removes its container. */
  done: () => Promise<void>
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Carousel', () => {
  it('renders nothing when there are no slides', async () => {
    const view = html({}, 0)
    // Svelte's own block anchor (a comment) is all that is left; React renders no element either.
    expect(view.markup.replace(/<!--.*?-->/g, '')).toBe('')
    await view.done()
  })

  it('wraps a slide inserted between two others in its own wrapper', async () => {
    // Regression: the port wrapped the nodes a `children` snippet had already
    // rendered, so Svelte inserted a new slide relative to a node now inside
    // another slide's wrapper (or dropped it). Every entry now gets a wrapper
    // from this component's own `{#each}`.
    const view = live({}, 3)
    view.setSlides([0, 9, 1, 2])
    flushSync()
    const markup = view.markup()

    expect(markup.split('data-mol-id="carousel-slide"').length - 1).toBe(4)
    expect(markup.split('data-mol-id="carousel-dot"').length - 1).toBe(4)
    const order = ['slide-0', 'slide-9', 'slide-1', 'slide-2'].map((text) => markup.indexOf(text))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    await view.done()
  })

  it('reorders the wrappers when a slide moves', async () => {
    const view = live({}, 3)
    view.setSlides([2, 0, 1])
    flushSync()
    const markup = view.markup()

    expect(markup.split('data-mol-id="carousel-slide"').length - 1).toBe(3)
    expect(markup.indexOf('slide-2')).toBeLessThan(markup.indexOf('slide-0'))
    await view.done()
  })

  it('renders no wrapper when the list empties and wraps a slide again when it refills', async () => {
    // Regression: the empty render detached the component's root element, so a
    // later refill re-appended it at the end of the old parent (or nowhere).
    const view = live({}, 3)
    view.setSlides([])
    flushSync()
    expect(view.markup().replace(/<!--.*?-->/g, '')).toBe('')

    view.setSlides([7])
    flushSync()
    const markup = view.markup()
    expect(markup.split('data-mol-id="carousel-slide"').length - 1).toBe(1)
    expect(markup).toContain('slide-7')
    await view.done()
  })

  it('appears when inserted before an empty carousel in a keyed list', async () => {
    // Regression: an empty carousel detached its root element, which was the
    // keyed item's only node, so a carousel inserted before it never rendered.
    const target = document.createElement('div')
    document.body.appendChild(target)
    const instance = mount(CarouselEachHost, {
      target,
      props: { groups: [{ id: 'empty', slides: [] }] },
    }) as unknown as { setGroups(next: { id: string; slides: number[] }[]): void }
    flushSync()

    instance.setGroups([
      { id: 'first', slides: [1] },
      { id: 'empty', slides: [] },
    ])
    flushSync()
    const markup = target.innerHTML
    expect(markup.split('data-mol-id="carousel-slide"').length - 1).toBe(1)
    expect(markup).toContain('slide-1')

    await unmount(instance as never)
    target.remove()
  })

  it('renders every slide', async () => {
    const view = html({}, 3)
    expect(view.markup).toContain('slide-0')
    expect(view.markup).toContain('slide-1')
    expect(view.markup).toContain('slide-2')
    await view.done()
  })

  it('marks non-active slides aria-hidden', async () => {
    const view = html({}, 3)
    // slides 1 and 2 hidden, slide 0 active. Scoped to the slide wrappers so
    // decorative `aria-hidden` elsewhere (the dot glyphs) cannot skew the count.
    expect(view.markup.split('data-mol-id="carousel-slide" aria-hidden="true"').length - 1).toBe(2)
    await view.done()
  })

  it('renders prev/next arrows when showArrows and there is more than one slide', async () => {
    const view = html({}, 3)
    expect(view.markup).toContain('aria-label="Previous"')
    expect(view.markup).toContain('aria-label="Next"')
    await view.done()
  })

  it('pins the prev arrow left and the next arrow right, both vertically centered', async () => {
    // Regression: both arrows used `cm.position('absolute')` with no offsets,
    // so they stacked at the same spot (top-left).
    const view = html({}, 3)
    const markup = view.markup
    const firstClose = markup.indexOf('</button>')
    const rest = markup.slice(firstClose + '</button>'.length)
    const prev = markup.slice(0, firstClose)
    const next = rest.slice(0, rest.indexOf('</button>'))

    expect(prev).toContain('aria-label="Previous"')
    expect(prev).toContain('left: 8px')
    expect(prev).not.toContain('right: 8px')

    expect(next).toContain('aria-label="Next"')
    expect(next).toContain('right: 8px')
    expect(next).not.toContain('left: 8px')

    // Both arrows are vertically centered (offset + translate), not stacked.
    expect((markup.match(/top: 50%/g) ?? []).length).toBe(2)
    expect((markup.match(/translateY\(-50%\)/g) ?? []).length).toBe(2)
    await view.done()
  })

  it('omits the arrows when showArrows is false', async () => {
    const view = html({ showArrows: false }, 3)
    expect(view.markup).not.toContain('aria-label="Previous"')
    await view.done()
  })

  it('omits the arrows for a single slide', async () => {
    const view = html({}, 1)
    expect(view.markup).not.toContain('aria-label="Next"')
    await view.done()
  })

  it('renders the dot strip with aria-current on the active slide', async () => {
    const view = html({}, 3)
    expect(view.markup).toContain('aria-label="Go to slide 1"')
    expect(view.markup).toContain('aria-current="true"')
    await view.done()
  })

  it('omits the dot strip when showDots is false', async () => {
    const view = html({ showDots: false }, 3)
    expect(view.markup).not.toContain('Go to slide')
    await view.done()
  })

  it('honours a controlled index', async () => {
    const view = html({ index: 2 }, 3)
    // dot 3 (index 2) is current
    expect(view.markup).toContain('aria-label="Go to slide 3" aria-current="true"')
    await view.done()
  })

  it('forwards className', async () => {
    const view = html({ className: 'car-cls' }, 2)
    expect(view.markup).toContain('car-cls')
    await view.done()
  })
})
