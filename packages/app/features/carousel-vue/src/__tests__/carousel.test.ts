// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Carousel` — a port of
 * `@molecule/app-carousel-react/src/__tests__/carousel.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    // Interpolates `{{name}}` placeholders the way the real translator does,
    // so a label built from values is asserted as the user would read it.
    t: (
      _key: string,
      values?: Record<string, unknown>,
      opts?: { defaultValue?: string },
    ): string => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) s = s.replaceAll(`{{${k}}}`, String(v))
      }
      return s
    },
  }),
}))

// Forward `style` and `class` exactly as the real `<Button>` does, so arrow
// positioning is observable in the rendered markup.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      props: {
        variant: String,
        size: String,
        className: String,
        style: [String, Object],
      },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              'aria-label': attrs['aria-label'],
              style: props.style ?? attrs.style,
              class: [props.className, attrs.class].filter(Boolean).join(' '),
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, createCommentVNode, defineComponent, Fragment, h, type VNodeChild } from 'vue'

const { Carousel } = await import('../Carousel.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link Carousel} and returns the markup it produced.
 *
 * @param props - The component props.
 * @param children - The slides, passed as the default slot.
 * @returns The rendered markup.
 */
const html = (props: Record<string, unknown>, children?: VNodeChild[]): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(Carousel, props, children ? { default: () => children } : undefined),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/**
 * Builds slide elements — React's `slides(n)` helper.
 *
 * @param n - How many slides.
 * @returns The slide VNodes.
 */
const slides = (n: number): VNodeChild[] =>
  Array.from({ length: n }, (_, i) => h('div', { 'data-slide': String(i) }, `slide-${i}`))

describe('Carousel', () => {
  it('renders nothing when there are no slides', () => {
    // Vue leaves a comment anchor where a component rendered nothing; it is
    // not an element, so the rendered page is empty just as React's is.
    expect(html({}, []).replace(/<!---->/g, '')).toBe('')
  })

  it('renders every slide', () => {
    const markup = html({}, slides(3))
    expect(markup).toContain('slide-0')
    expect(markup).toContain('slide-1')
    expect(markup).toContain('slide-2')
  })

  it('marks non-active slides aria-hidden', () => {
    const markup = html({}, slides(3))
    // slides 1 and 2 hidden, slide 0 active. Scoped to the slide wrappers so
    // decorative `aria-hidden` elsewhere (the dot glyphs) cannot skew the count.
    expect(markup.split('data-mol-id="carousel-slide" aria-hidden="true"').length - 1).toBe(2)
  })

  it('renders prev/next arrows when showArrows and there is more than one slide', () => {
    const markup = html({}, slides(3))
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
  })

  it('pins the prev arrow left and the next arrow right, both vertically centered', () => {
    // Regression: both arrows used `cm.position('absolute')` with no offsets,
    // so they stacked at the same spot (top-left).
    const markup = html({}, slides(3))
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
  })

  it('omits the arrows when showArrows is false', () => {
    const markup = html({ showArrows: false }, slides(3))
    expect(markup).not.toContain('aria-label="Previous"')
  })

  it('omits the arrows for a single slide', () => {
    const markup = html({}, slides(1))
    expect(markup).not.toContain('aria-label="Next"')
  })

  it('renders the dot strip with aria-current on the active slide', () => {
    const markup = html({}, slides(3))
    expect(markup).toContain('aria-label="Go to slide 1"')
    expect(markup).toContain('aria-current="true"')
  })

  it('omits the dot strip when showDots is false', () => {
    const markup = html({ showDots: false }, slides(3))
    expect(markup).not.toContain('Go to slide')
  })

  it('honours a controlled index', () => {
    const markup = html({ index: 2 }, slides(3))
    // dot 3 (index 2) is current
    expect(markup).toContain('aria-label="Go to slide 3" aria-current="true"')
  })

  it('forwards className', () => {
    const markup = html({ className: 'car-cls' }, slides(2))
    expect(markup).toContain('car-cls')
  })

  it('wraps each slide of a v-for child list in its own wrapper and skips a false v-if', () => {
    // `<Carousel><img v-for="s in slides" /></Carousel>` compiles the v-for to
    // one Fragment vnode holding three slides; React sees three children.
    const fromVFor = html({ showArrows: false }, [h(Fragment, null, slides(3))])
    expect(fromVFor.split('data-mol-id="carousel-slide"').length - 1).toBe(3)
    expect(fromVFor.split('data-mol-id="carousel-dot"').length - 1).toBe(3)

    // A false `v-if` (a Comment vnode) is not a slide: React renders one
    // wrapper and no dot strip for it.
    const withFalseBranch = html({ showArrows: false }, [
      h('img', { 'data-slide': 'only' }),
      createCommentVNode('v-if', true),
    ])
    expect(withFalseBranch.split('data-mol-id="carousel-slide"').length - 1).toBe(1)
    expect(withFalseBranch).not.toContain('data-mol-id="carousel-dot"')
  })
})
