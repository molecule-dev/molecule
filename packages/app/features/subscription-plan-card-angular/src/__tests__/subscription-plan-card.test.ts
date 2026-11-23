// @vitest-environment jsdom
/**
 * Unit tests of `SubscriptionPlanCard` — the port of
 * `@molecule/app-subscription-plan-card-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
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
import { afterEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

import { SubscriptionPlanCard } from '../subscription-plan-card.component.js'

/** A mounted spec host: its DOM, a props setter and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the card through a JIT host template, written the way an Angular app
 * would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @param content - Extra projected content (a `slot="description"` node).
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>, content = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SubscriptionPlanCard],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div
      mol-subscription-plan-card
      [name]="p['name']"
      [description]="p['description']"
      [price]="p['price']"
      [interval]="p['interval']"
      [features]="p['features']"
      [ctaLabel]="p['ctaLabel']"
      [onCta]="p['onCta']"
      [ctaHref]="p['ctaHref']"
      [recommended]="p['recommended']"
      [badge]="p['badge']"
      [className]="p['className']"
    >${content}</div>`,
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
  // The first tick reads the projected slots; the second applies what that
  // read decided (the default "Recommended" badge text).
  appRef.tick()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Mounts one card and tracks it for teardown. */
const render = async (props: Record<string, unknown>, content = ''): Promise<Mounted> => {
  const m = await mount(props, content)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SubscriptionPlanCard', () => {
  it('renders the name in an <h3>, the price, and the interval', async () => {
    const m = await render({ name: 'Pro', price: '$19', interval: '/mo', features: ['Unlimited'] })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Pro')
    expect(m.host.innerHTML).toContain('$19')
    expect(m.host.innerHTML).toContain('/mo')
  })

  it('renders each feature with a check mark', async () => {
    const m = await render({ name: 'P', price: '$1', features: ['Feature A', 'Feature B'] })
    expect(m.host.innerHTML).toContain('Feature A')
    expect(m.host.innerHTML).toContain('Feature B')
    expect(m.host.innerHTML.split('✓').length - 1).toBe(2)
  })

  it('renders the CTA as a button (onCta) or a link (ctaHref)', async () => {
    const withClick = await render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      onCta: () => {},
    })
    expect(withClick.host.innerHTML).toContain('Choose Pro')
    const withHref = await render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      ctaHref: '/checkout',
    })
    expect(withHref.host.innerHTML).toContain('href="/checkout"')
  })

  it('highlights a recommended plan with the default badge and outline style', async () => {
    const m = await render({ name: 'P', price: '$1', features: [], recommended: true })
    expect(m.host.innerHTML).toContain('Recommended')
    expect(inlineStyleMismatch(m.host.innerHTML, { outline: '2px solid currentColor' })).toBeNull()
  })

  it('renders a custom badge', async () => {
    const m = await render({ name: 'P', price: '$1', features: [], badge: 'Most popular' })
    expect(m.host.innerHTML).toContain('Most popular')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of description', async () => {
    const m = await render(
      { name: 'P', price: '$1', features: [], xs: [1, 3] },
      `<span slot="description">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</span>`,
    )
    const items = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    await m.setProps({ xs: [0, 1, 2, 3] })
    expect(items()).toEqual(['0', '1', '2', '3'])
    await m.setProps({ xs: [0, 2, 3] })
    expect(items()).toEqual(['0', '2', '3'])
  })

  it('forwards className', async () => {
    const m = await render({ name: 'P', price: '$1', features: [], className: 'spc-cls' })
    expect(m.host.innerHTML).toContain('spc-cls')
  })

  it('shows and removes the description wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { name: 'P', price: '$1', features: [], on: false },
      `@if (p['on']) {<b slot="description" data-desc>Hi there</b>}`,
    )
    // React: `{description && <p>…</p>}` — no paragraph for an empty slot.
    expect(m.host.querySelector('[data-desc]')).toBeNull()
    expect(m.host.querySelector('p')).toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[data-desc]')?.parentElement?.tagName.toLowerCase()).toBe('p')
    expect(m.host.querySelector('p')?.textContent).toBe('Hi there')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-desc]')).toBeNull()
    expect(m.host.querySelector('p')).toBeNull()
  })

  it('follows a badge slot the consumer @if adds and removes, with the default badge in between, and renders the CTA label with no wrapper', async () => {
    const m = await render(
      { name: 'P', price: '$1', features: [], recommended: true, on: false },
      `@if (p['on']) {<b slot="badge" data-badge>Best</b>}<i slot="ctaLabel" data-cta>Go</i>`,
    )
    const badge = (): HTMLElement =>
      m.host.querySelector('header')!.firstElementChild as HTMLElement
    // React: `{(badge || recommended) && <span>{badge ?? t('plan.recommended')}</span>}`.
    expect(badge().tagName).toBe('SPAN')
    expect(badge().textContent).toBe('Recommended')
    await m.setProps({ on: true })
    expect(badge().textContent).toBe('Best')
    expect(m.host.querySelector('[data-badge]')!.parentElement).toBe(badge())
    await m.setProps({ on: false })
    expect(badge().textContent).toBe('Recommended')
    // React: `<Button>{ctaLabel}</Button>` — the label is the button's child.
    expect(m.host.querySelector('[data-cta]')!.parentElement!.tagName).toBe('BUTTON')
  })
})
