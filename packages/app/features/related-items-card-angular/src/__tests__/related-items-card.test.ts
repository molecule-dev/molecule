// @vitest-environment jsdom
/**
 * Unit tests of `RelatedItemsCard` — the port of
 * `@molecule/app-related-items-card-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
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

const { RelatedItemsCard } = await import('../related-items-card.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
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
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * The component's host element with every input bound from the spec props and
 * the item template the rows render (`$implicit`/`a0` = the item, `a1` = its
 * index, as the component passes them).
 *
 * @param content - Projected content (the `slot`-marked nodes).
 * @returns The host template.
 */
const hostTemplate = (content = ''): string =>
  `<ng-template #row let-item let-i="a1">
    <span [attr.data-item]="item.name">{{ item.name }}</span>
  </ng-template>
  <div mol-related-items-card
    [title]="p['title']"
    [items]="p['items']"
    [renderItem]="row"
    [onItemClick]="p['onItemClick']"
    [emptyState]="p['emptyState']"
    [viewAllHref]="p['viewAllHref']"
    [className]="p['className']"
    [dataMolId]="p['dataMolId']">${content}</div>`

const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(hostTemplate(content), RelatedItemsCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

const items = [{ name: 'Deal A' }, { name: 'Deal B' }]
const noop = (): void => {}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('RelatedItemsCard', () => {
  it('renders the title in an <h3> and each item', async () => {
    const m = await render({ title: 'Deals', items })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Deals')
    expect(m.host.innerHTML).toContain('data-item="Deal A"')
    expect(m.host.innerHTML).toContain('data-item="Deal B"')
  })

  it('renders the icon and headerActions slots', async () => {
    const m = await render(
      { title: 'T', items },
      `<span slot="icon" data-icon></span><button slot="headerActions" data-actions></button>`,
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
    expect(m.host.innerHTML).toContain('data-actions=""')
  })

  it('renders the emptyState when items is empty', async () => {
    const m = await render(
      { title: 'T', items: [] },
      `<p slot="emptyState" data-empty>No related items</p>`,
    )
    expect(m.host.innerHTML).toContain('data-empty=""')
  })

  it('renders a "View all" link when viewAllHref is supplied', async () => {
    const m = await render({ title: 'T', items, viewAllHref: '/deals' })
    expect(m.host.innerHTML).toContain('href="/deals"')
    expect(m.host.innerHTML).toContain('View all')
  })

  it('still renders every item row when onItemClick is supplied', async () => {
    const m = await render({ title: 'T', items, onItemClick: noop })
    expect(m.host.innerHTML.match(/<li/g) ?? []).toHaveLength(2)
    expect(m.host.innerHTML).toContain('data-item="Deal A"')
    expect(m.host.innerHTML).toContain('data-item="Deal B"')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render({ title: 'T', items, dataMolId: 'ric-x', className: 'ric-cls' })
    expect(m.host.innerHTML).toContain('data-mol-id="ric-x"')
    expect(m.host.innerHTML).toContain('ric-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of the emptyState slot', async () => {
    const m = await render(
      { title: 'T', items: [], xs: ['a', 'c'] },
      `@for (x of p['xs']; track x) {<b slot="emptyState">{{ x }}</b>}`,
    )
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(shown()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(shown()).toEqual(['a', 'c'])
  })

  it('shows and removes the emptyState wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { title: 'T', items: [], on: false },
      `@if (p['on']) {<p slot="emptyState" data-empty>No items</p>}`,
    )
    const empty = (): HTMLElement | null => m.host.querySelector('[data-empty]')
    // No projected empty state: React renders nothing bare in its place.
    expect(empty()).toBeNull()
    await m.setProps({ on: true })
    // The empty state arrives: it renders bare in its place in the same pass.
    expect(empty()).not.toBeNull()
    expect(empty()?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(empty()).toBeNull()
  })

  it('renders the empty state bare when it comes through an OnPush component, in the pass where the consumer @if adds and removes its content', async () => {
    // No hook of the card runs here: the OnPush component in between is not checked when only the
    // consumer's @if changes. React has no such boundary; its empty state follows the consumer's state.
    const Mid = Component({
      selector: 'mol-spec-onpush-mid',
      standalone: true,
      imports: [RelatedItemsCard as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div mol-related-items-card [title]="'T'" [items]="[]"><ng-content select="[slot=emptyState]" ngProjectAs="[slot=emptyState]"></ng-content></div>`,
    })(class SpecOnPushMid {})
    const m = await mount(
      `<mol-spec-onpush-mid>@if (p['on']) {<p slot="emptyState" data-empty>No items</p>}</mol-spec-onpush-mid>`,
      Mid,
      { on: false },
    )
    mounted.push(m)
    const empty = (): HTMLElement | null => m.host.querySelector('[data-empty]')
    expect(empty()).toBeNull()
    await m.setProps({ on: true })
    // React: the empty state stands beside the card's <header>, with no capture element around it.
    expect(empty()?.parentElement).toBe(m.host.querySelector('header')?.parentElement)
    await m.setProps({ on: false })
    expect(empty()).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i>${hostTemplate('<p slot="emptyState" data-empty>No items</p>')}<i>b</i>`,
      RelatedItemsCard as Type<unknown>,
      { title: 'T', items: [] },
    )
    mounted.push(m)
    // The consumer's children are exactly React's: the two neighbours and the card
    // (its root, so the host element itself), with no extra host or capture.
    const shape = (): string =>
      Array.from(m.host.childNodes)
        .filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''),
        )
        .map((n) => (n.nodeType === 1 ? (n as Element).tagName : '#text'))
        .join(',')
    const empty = (): HTMLElement | null => m.host.querySelector('[data-empty]')
    expect(shape()).toBe('I,DIV,I')
    // The projected empty state renders bare in the card, no capture span around it.
    expect(empty()?.parentElement?.tagName).toBe('DIV')
    await m.setProps({ items: [{ name: 'Deal A' }] })
    // The list returns and the empty state hides; nothing is added beside the card.
    expect(shape()).toBe('I,DIV,I')
    expect(empty()).toBeNull()
  })
})
