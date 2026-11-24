// @vitest-environment jsdom
/**
 * Unit tests of the Angular `EmptyState` and `CtaCard` — the port of
 * `@molecule/app-empty-state-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `textCenter`), so tests can assert which cm.* class was applied without a
// real bond.
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

const { CtaCard } = await import('../cta-card.component.js')
const { EmptyState } = await import('../empty-state.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Mounted spec hosts so far: Angular derives a component id from the definition. */
let hostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await appRef.whenStable()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      await appRef.whenStable()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('EmptyState', () => {
  const emptyState = (content = ''): string =>
    `<section mol-empty-state [title]="p['title']" [description]="p['description']" [icon]="p['icon']" [action]="p['action']" [dataMolId]="p['dataMolId']" [className]="p['className']" [iconWrapperClassName]="p['iconWrapperClassName']">${content}</section>`

  it('renders the title inside an <h3>', async () => {
    const m = await render(emptyState(), EmptyState, { title: 'No comments yet' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', async () => {
    const withIcon = await render(emptyState('<i slot="icon" data-icon></i>'), EmptyState, {
      title: 'T',
    })
    expect(withIcon.host.innerHTML).toContain('data-icon')
    const without = await render(emptyState(), EmptyState, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-icon')
  })

  it.each(['icon', 'description', 'action'])(
    'renders an empty or false %s as React does: the same as leaving it out',
    async (name) => {
      const omitted = await render(emptyState(), EmptyState, { title: 'T' })
      for (const value of ['', false]) {
        const given = await render(emptyState(), EmptyState, { title: 'T', [name]: value })
        expect(given.host.innerHTML, String(value)).toBe(omitted.host.innerHTML)
      }
    },
  )

  it('renders the description when present and omits it otherwise', async () => {
    const withDescription = await render(emptyState(), EmptyState, {
      title: 'T',
      description: 'desc-x',
    })
    expect(withDescription.host.innerHTML).toContain('desc-x')
    const without = await render(emptyState(), EmptyState, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('<p')
  })

  it('renders the action node', async () => {
    const m = await render(emptyState('<button slot="action" data-act></button>'), EmptyState, {
      title: 'T',
    })
    expect(m.host.innerHTML).toContain('data-act')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of description', async () => {
    const m = await render(
      emptyState(`@for (x of p['xs']; track x) {<b slot="description">{{ x }}</b>}`),
      EmptyState,
      { title: 'T', xs: [1, 3] },
    )
    const items = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    await m.setProps({ xs: [0, 1, 2, 3] })
    expect(items()).toEqual(['0', '1', '2', '3'])
    await m.setProps({ xs: [0, 2, 3] })
    expect(items()).toEqual(['0', '2', '3'])
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', async () => {
    const m = await render(emptyState('<i slot="icon"></i>'), EmptyState, {
      title: 'T',
      dataMolId: 'empty-x',
      className: 'es-cls',
      iconWrapperClassName: 'icon-cls',
    })
    expect(m.host.innerHTML).toContain('data-mol-id="empty-x"')
    expect(m.host.innerHTML).toContain('es-cls')
    expect(m.host.innerHTML).toContain('icon-cls')
  })

  it('shows and removes the description wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<section mol-empty-state [title]="p['title']">@if (p['on']) {<b slot="description" data-desc>More</b>}</section>`,
      EmptyState,
      { title: 'T', on: false },
    )
    // React: `{content.description && <p>…</p>}` — no paragraph for an empty slot.
    expect(m.host.querySelector('[data-desc]')).toBeNull()
    expect(m.host.querySelector('p')).toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[data-desc]')!.parentElement!.tagName.toLowerCase()).toBe('p')
    expect(m.host.querySelector('p')!.textContent).toBe('More')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-desc]')).toBeNull()
    expect(m.host.querySelector('p')).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await render(
      `<i>a</i><section mol-empty-state [title]="p['title']" [description]="p['description']"><button slot="action" data-act>A</button></section><i>b</i>`,
      EmptyState,
      { title: 'T' },
    )
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // The host IS React's root <section>; the section stays between the siblings.
    expect(children()).toEqual(['i', 'section', 'i'])
    // The projected action is a direct child of the section — no capture <div> remains.
    const section = m.host.querySelector('section') as HTMLElement
    const action = m.host.querySelector('[data-act]') as HTMLElement
    expect(action.parentElement).toBe(section)
    // Toggling the description adds the <p> inside the section, without a sibling.
    expect(section.querySelector('p')).toBeNull()
    await m.setProps({ description: 'desc-x' })
    expect(children()).toEqual(['i', 'section', 'i'])
    expect(section.querySelector('p')).not.toBeNull()
  })
})

describe('CtaCard', () => {
  const ctaCard = (content = ''): string =>
    `<section mol-cta-card [title]="p['title']" [eyebrow]="p['eyebrow']" [description]="p['description']" [action]="p['action']" [media]="p['media']" [layout]="p['layout']" [dataMolId]="p['dataMolId']" [className]="p['className']">${content}</section>`

  it('renders the title inside an <h3>', async () => {
    const m = await render(ctaCard(), CtaCard, { title: 'Connect your bank' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', async () => {
    const withEyebrow = await render(ctaCard(), CtaCard, { title: 'T', eyebrow: 'NEW' })
    expect(withEyebrow.host.innerHTML).toContain('NEW')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('NEW')
  })

  it.each(['eyebrow', 'description', 'action', 'media'])(
    'renders an empty or false %s as React does: the same as leaving it out',
    async (name) => {
      const omitted = await render(ctaCard(), CtaCard, { title: 'T' })
      for (const value of ['', false]) {
        const given = await render(ctaCard(), CtaCard, { title: 'T', [name]: value })
        expect(given.host.innerHTML, String(value)).toBe(omitted.host.innerHTML)
      }
    },
  )

  it('renders the description when present and omits it otherwise', async () => {
    const withDescription = await render(ctaCard(), CtaCard, {
      title: 'T',
      description: 'desc-x',
    })
    expect(withDescription.host.innerHTML).toContain('desc-x')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', async () => {
    const withAction = await render(ctaCard('<button slot="action" data-act></button>'), CtaCard, {
      title: 'T',
    })
    expect(withAction.host.innerHTML).toContain('data-act')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', async () => {
    const withMedia = await render(ctaCard('<img slot="media" data-media />'), CtaCard, {
      title: 'T',
    })
    expect(withMedia.host.innerHTML).toContain('data-media')
    const without = await render(ctaCard(), CtaCard, { title: 'T' })
    expect(without.host.innerHTML).not.toContain('data-media')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of action', async () => {
    const m = await render(
      ctaCard(`@for (x of p['xs']; track x) {<b slot="action">{{ x }}</b>}`),
      CtaCard,
      { title: 'T', xs: [1, 3] },
    )
    const items = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    await m.setProps({ xs: [0, 1, 2, 3] })
    expect(items()).toEqual(['0', '1', '2', '3'])
    await m.setProps({ xs: [0, 2, 3] })
    expect(items()).toEqual(['0', '2', '3'])
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(ctaCard(), CtaCard, {
      title: 'T',
      dataMolId: 'cta-x',
      className: 'cta-cls',
    })
    expect(m.host.innerHTML).toContain('data-mol-id="cta-x"')
    expect(m.host.innerHTML).toContain('cta-cls')
  })

  it('shows and removes the eyebrow wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<section mol-cta-card [title]="p['title']">@if (p['on']) {<b slot="eyebrow" data-eyebrow>New</b>}</section>`,
      CtaCard,
      { title: 'T', on: false },
    )
    // React: `{eyebrow && <div>…</div>}` — no wrapper for an empty slot.
    expect(m.host.querySelector('[data-eyebrow]')).toBeNull()
    await m.setProps({ on: true })
    const projected = m.host.querySelector('[data-eyebrow]')!
    expect(projected.parentElement!.tagName.toLowerCase()).toBe('div')
    expect(projected.textContent).toBe('New')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-eyebrow]')).toBeNull()
  })
})
