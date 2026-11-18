// @vitest-environment jsdom
/**
 * Unit tests for the Solid `Carousel` — a port of
 * `@molecule/app-carousel-react/src/__tests__/carousel.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-solid', () => ({
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
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    className?: string
    style?: JSX.CSSProperties
    onClick?: () => void
    'aria-label'?: string
  }) => (
    <button
      data-button=""
      aria-label={props['aria-label']}
      style={props.style}
      class={props.className}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  ),
}))

const { Carousel } = await import('../Carousel.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a {@link Carousel} and returns the container it rendered into.
 *
 * @param props - The component props.
 * @param children - The slides.
 * @returns The mount container.
 */
const mount = (props: Record<string, unknown>, children?: JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <Carousel {...props}>{children}</Carousel>, container))
  return container
}

/**
 * Renders a {@link Carousel} and returns the markup it produced.
 *
 * @param props - The component props.
 * @param children - The slides.
 * @returns The rendered markup.
 */
const html = (props: Record<string, unknown>, children?: JSX.Element): string =>
  mount(props, children).innerHTML

/**
 * Builds slide elements — React's `slides(n)` helper.
 *
 * @param n - How many slides.
 * @returns The slide elements.
 */
const slides = (n: number): JSX.Element[] =>
  Array.from({ length: n }, (_, i) => <div data-slide={String(i)}>{`slide-${i}`}</div>)

describe('Carousel', () => {
  it('renders nothing when there are no slides', () => {
    expect(html({}, [])).toBe('')
  })

  it('renders every slide', () => {
    const markup = html({}, slides(3))
    expect(markup).toContain('slide-0')
    expect(markup).toContain('slide-1')
    expect(markup).toContain('slide-2')
  })

  it('marks non-active slides aria-hidden', () => {
    const container = mount({}, slides(3))
    // slides 1 and 2 hidden, slide 0 active. Scoped to the slide wrappers so
    // decorative `aria-hidden` elsewhere (the dot glyphs) cannot skew the count.
    const wrappers = container.querySelectorAll('[data-mol-id="carousel-slide"]')
    expect(wrappers.length).toBe(3)
    expect(
      container.querySelectorAll('[data-mol-id="carousel-slide"][aria-hidden="true"]').length,
    ).toBe(2)
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
    const container = mount({ index: 2 }, slides(3))
    // dot 3 (index 2) is current
    const current = container.querySelector('[data-mol-id="carousel-dot"][aria-current="true"]')
    expect(current?.getAttribute('aria-label')).toBe('Go to slide 3')
  })

  it('forwards className', () => {
    const markup = html({ className: 'car-cls' }, slides(2))
    expect(markup).toContain('car-cls')
  })
})
