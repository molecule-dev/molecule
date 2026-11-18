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
vi.mock('@molecule/app-svelte', () => ({
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

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Carousel', () => {
  it('renders nothing when there are no slides', async () => {
    const view = html({}, 0)
    expect(view.markup).toBe('')
    await view.done()
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
