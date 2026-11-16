// @vitest-environment jsdom
/**
 * Unit tests for the Solid listing-card primitives — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Solid in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

// `Card` is the only `@molecule/app-ui-solid` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + the click handler +
// children, the same observable contract the React suite's Card mock has.
vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: {
    children?: JSX.Element
    className?: string
    'data-mol-id'?: string
    onClick?: (event: MouseEvent) => void
  }) => (
    <div
      data-card=""
      data-mol-id={props['data-mol-id']}
      class={props.className}
      onClick={props.onClick}
    >
      {props.children}
    </div>
  ),
}))

const { ListingCard, ListingCardActions, ListingCardBody, ListingCardMedia, ListingGrid } =
  await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The host element whose markup the view produced.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ListingCardActions', () => {
  it('renders its children', () => {
    const container = mount(() => (
      <ListingCardActions>
        <button data-a="" />
      </ListingCardActions>
    ))
    expect(container.innerHTML).toContain('data-a=""')
  })

  it('renders with the stacked layout without error', () => {
    const container = mount(() => <ListingCardActions layout="stacked">x</ListingCardActions>)
    expect(container.innerHTML).toContain('x')
  })

  it('forwards className', () => {
    const container = mount(() => <ListingCardActions className="act-cls">x</ListingCardActions>)
    expect(container.innerHTML).toContain('act-cls')
  })
})

describe('ListingCardBody', () => {
  it('renders the title', () => {
    const container = mount(() => <ListingCardBody title="Widget" />)
    expect(container.innerHTML).toContain('<h3')
    expect(container.innerHTML).toContain('Widget')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(mount(() => <ListingCardBody title="T" subtitle="sub-x" />).innerHTML).toContain('sub-x')
    expect(mount(() => <ListingCardBody title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the price when present', () => {
    const container = mount(() => <ListingCardBody title="T" price="$42" />)
    expect(container.innerHTML).toContain('$42')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = mount(() => <ListingCardBody title="T" meta={<span data-meta="" />} />)
    expect(withMeta.innerHTML).toContain('data-meta=""')
    const without = mount(() => <ListingCardBody title="T" />)
    expect(without.innerHTML).not.toContain('data-meta')
  })

  it('forwards className', () => {
    const container = mount(() => <ListingCardBody title="T" className="body-cls" />)
    expect(container.innerHTML).toContain('body-cls')
  })
})

describe('ListingCardMedia', () => {
  it('renders an <img> with src and alt when src is given and no children', () => {
    const container = mount(() => <ListingCardMedia src="pic.png" alt="a photo" />)
    expect(container.innerHTML).toContain('src="pic.png"')
    expect(container.innerHTML).toContain('alt="a photo"')
  })

  it('defaults alt to an empty string when not supplied', () => {
    const container = mount(() => <ListingCardMedia src="pic.png" />)
    expect(container.innerHTML).toContain('alt=""')
  })

  it('renders children instead of the <img> when children are given', () => {
    const container = mount(() => (
      <ListingCardMedia src="pic.png">
        <video data-video="" />
      </ListingCardMedia>
    ))
    expect(container.innerHTML).toContain('data-video=""')
    expect(container.innerHTML).not.toContain('<img')
  })

  it('renders the overlay node when given', () => {
    const container = mount(() => (
      <ListingCardMedia src="pic.png" overlay={<span data-overlay="" />} />
    ))
    expect(container.innerHTML).toContain('data-overlay=""')
  })

  it('locks the default 4/3 aspect ratio via inline style', () => {
    const container = mount(() => <ListingCardMedia src="pic.png" />)
    expect(container.innerHTML).toContain('aspect-ratio: 4 / 3')
  })

  it('honours a custom aspect ratio', () => {
    const container = mount(() => <ListingCardMedia src="pic.png" aspect="16/9" />)
    expect(container.innerHTML).toContain('aspect-ratio: 16 / 9')
  })

  it('forwards className', () => {
    const container = mount(() => <ListingCardMedia src="pic.png" className="media-cls" />)
    expect(container.innerHTML).toContain('media-cls')
  })
})

describe('ListingCard', () => {
  it('renders its children inside the Card', () => {
    const container = mount(() => (
      <ListingCard>
        <div data-slot="" />
      </ListingCard>
    ))
    expect(container.innerHTML).toContain('data-card=""')
    expect(container.innerHTML).toContain('data-slot=""')
  })

  it('sets data-mol-id on the Card', () => {
    const container = mount(() => <ListingCard dataMolId="card-x">x</ListingCard>)
    expect(container.innerHTML).toContain('data-mol-id="card-x"')
  })

  it('marks the card clickable only when onClick is supplied', () => {
    expect(mount(() => <ListingCard onClick={() => {}}>x</ListingCard>).innerHTML).toContain(
      'cursorPointer',
    )
    expect(mount(() => <ListingCard>x</ListingCard>).innerHTML).not.toContain('cursorPointer')
  })

  it('forwards className', () => {
    const container = mount(() => <ListingCard className="card-cls">x</ListingCard>)
    expect(container.innerHTML).toContain('card-cls')
  })
})

describe('ListingGrid', () => {
  it('renders its children', () => {
    const container = mount(() => (
      <ListingGrid>
        <div data-card="" />
      </ListingGrid>
    ))
    expect(container.innerHTML).toContain('data-card=""')
  })

  it('forwards className', () => {
    const container = mount(() => <ListingGrid className="grid-cls">x</ListingGrid>)
    expect(container.innerHTML).toContain('grid-cls')
  })
})
