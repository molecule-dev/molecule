// @vitest-environment jsdom
/**
 * Unit tests of the Angular listing-card primitives — the port of
 * `@molecule/app-listing-card-react`'s own suite. The React suite renders the
 * components with a mocked ClassMap and asserts the markup; this port mounts
 * the same tree through Angular's real renderer (the same `createApplication` +
 * JIT host approach the conformance kit's Angular adapter uses) and asserts the
 * same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

const { ListingCard } = await import('../listing-card.component.js')
const { ListingCardActions } = await import('../listing-card-actions.component.js')
const { ListingCardBody } = await import('../listing-card-body.component.js')
const { ListingCardMedia } = await import('../listing-card-media.component.js')
const { ListingGrid } = await import('../listing-grid.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ListingCard, ListingCardActions, ListingCardBody, ListingCardMedia, ListingGrid],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Renders one component host template and returns the mounted host.
 *
 * @param template - The host template.
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, props)
  mounted.push(m)
  return m
}

/** The card's start tag (class attribute included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('[mol-listing-card]')
  if (!el) throw new Error('no ListingCard host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`
}

/** The card's host template, with the given projected content. */
const cardTpl = (children = ''): string =>
  `<div mol-listing-card [onClick]="p['onClick']" [className]="p['className']" [dataMolId]="p['dataMolId']">${children}</div>`

/** The actions row's host template, with the given projected content. */
const actionsTpl = (children = ''): string =>
  `<div mol-listing-card-actions [layout]="p['layout']" [className]="p['className']">${children}</div>`

/** The body's host template, with the given projected content. */
const bodyTpl = (children = ''): string =>
  `<div mol-listing-card-body [title]="p['title']" [subtitle]="p['subtitle']" [price]="p['price']" [meta]="p['meta']" [className]="p['className']">${children}</div>`

/** The media's host template, with the given projected content. */
const mediaTpl = (children = ''): string =>
  `<div mol-listing-card-media [src]="p['src']" [alt]="p['alt']" [aspect]="p['aspect']" [className]="p['className']">${children}</div>`

/** The grid's host template, with the given projected content. */
const gridTpl = (children = ''): string =>
  `<div mol-listing-grid [columns]="p['columns']" [gap]="p['gap']" [className]="p['className']">${children}</div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('ListingCardActions', () => {
  it('renders its children', async () => {
    const m = await render(actionsTpl('<button data-a></button>'))
    expect(m.host.innerHTML).toContain('data-a')
  })

  it('renders with the stacked layout without error', async () => {
    const m = await render(actionsTpl('x'), { layout: 'stacked' })
    expect(m.host.innerHTML).toContain('x')
  })

  it('forwards className', async () => {
    const m = await render(actionsTpl('x'), { className: 'act-cls' })
    expect(m.host.innerHTML).toContain('act-cls')
  })
})

describe('ListingCardBody', () => {
  it('renders the title', async () => {
    const m = await render(bodyTpl(), { title: 'Widget' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Widget')
  })

  it('renders the subtitle when present and omits it otherwise', async () => {
    expect((await render(bodyTpl(), { title: 'T', subtitle: 'sub-x' })).host.innerHTML).toContain(
      'sub-x',
    )
    expect((await render(bodyTpl(), { title: 'T' })).host.innerHTML).not.toContain('<p')
  })

  it('renders the price when present', async () => {
    const m = await render(bodyTpl(), { title: 'T', price: '$42' })
    expect(m.host.innerHTML).toContain('$42')
  })

  it('renders the meta row when present and omits it otherwise', async () => {
    const withMeta = await render(bodyTpl('<span slot="meta" data-meta></span>'), { title: 'T' })
    expect(withMeta.host.innerHTML).toContain('data-meta')
    const without = await render(bodyTpl(), { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-meta')
  })

  it('forwards className', async () => {
    const m = await render(bodyTpl(), { title: 'T', className: 'body-cls' })
    expect(m.host.innerHTML).toContain('body-cls')
  })
})

describe('ListingCardMedia', () => {
  it('renders an <img> with src and alt when src is given and no children', async () => {
    const m = await render(mediaTpl(), { src: 'pic.png', alt: 'a photo' })
    expect(m.host.innerHTML).toContain('src="pic.png"')
    expect(m.host.innerHTML).toContain('alt="a photo"')
  })

  it('defaults alt to an empty string when not supplied', async () => {
    const m = await render(mediaTpl(), { src: 'pic.png' })
    expect(m.host.innerHTML).toContain('alt=""')
  })

  it('renders children instead of the <img> when children are given', async () => {
    const m = await render(mediaTpl('<video data-video></video>'), { src: 'pic.png' })
    expect(m.host.innerHTML).toContain('data-video')
    expect(m.host.innerHTML).not.toContain('<img')
  })

  it('renders the overlay node when given', async () => {
    const m = await render(mediaTpl('<span slot="overlay" data-overlay></span>'), {
      src: 'pic.png',
    })
    expect(m.host.innerHTML).toContain('data-overlay')
  })

  it('locks the default 4/3 aspect ratio via inline style', async () => {
    const m = await render(mediaTpl(), { src: 'pic.png' })
    expect(m.host.innerHTML).toContain('aspect-ratio: 4 / 3')
  })

  it('honours a custom aspect ratio', async () => {
    const m = await render(mediaTpl(), { src: 'pic.png', aspect: '16/9' })
    expect(m.host.innerHTML).toContain('aspect-ratio: 16 / 9')
  })

  it('forwards className', async () => {
    const m = await render(mediaTpl(), { src: 'pic.png', className: 'media-cls' })
    expect(m.host.innerHTML).toContain('media-cls')
  })
})

describe('ListingCard', () => {
  it('renders its children inside the Card', async () => {
    const m = await render(cardTpl('<div data-slot></div>'))
    expect(m.host.innerHTML).toContain('data-slot')
    expect(openTag(m.host)).toContain('cardPadding')
  })

  it('sets data-mol-id on the Card', async () => {
    const m = await render(cardTpl('x'), { dataMolId: 'card-x' })
    expect(m.host.innerHTML).toContain('data-mol-id="card-x"')
  })

  it('marks the card clickable only when onClick is supplied', async () => {
    const clickable = await render(cardTpl('x'), { onClick: () => {} })
    expect(openTag(clickable.host)).toContain('cursorPointer')
    const plain = await render(cardTpl('x'))
    expect(openTag(plain.host)).not.toContain('cursorPointer')
  })

  it('forwards className', async () => {
    const m = await render(cardTpl('x'), { className: 'card-cls' })
    expect(openTag(m.host)).toContain('card-cls')
  })
})

describe('ListingGrid', () => {
  it('renders its children', async () => {
    const m = await render(gridTpl('<div data-card></div>'))
    expect(m.host.innerHTML).toContain('data-card')
  })

  it('forwards className', async () => {
    const m = await render(gridTpl('x'), { className: 'grid-cls' })
    expect(m.host.innerHTML).toContain('grid-cls')
  })
})
