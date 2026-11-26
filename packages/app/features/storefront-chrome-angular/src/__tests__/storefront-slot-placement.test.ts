// @vitest-environment jsdom
/**
 * DOM-placement tests for the storefront chrome's projected slots: each slot's
 * capture `<span>` renders its content bare in place and never reaches the page,
 * while the component's host stays because it IS React's root element.
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

import { createMemoryRouter } from '@molecule/app-routing'

// The same ClassMap token proxy the package's other unit tests use.
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
        return (...args: unknown[]) => `mock-${token}-${args.join('-')}`
      },
    }
    return new Proxy({}, handler)
  },
}))

const { provideDomPlacement, provideRouter } = await import('@molecule/app-angular')
const { StorefrontAnnouncementBar } = await import('../storefront-announcement-bar.component.js')
const { StorefrontFooter } = await import('../storefront-footer.component.js')

/** What a mount hands back to the test. */
interface Mounted {
  /** The host element (the spec host holding the component). */
  host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  set(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** Hosts awaiting teardown. */
const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts one component through a JIT host template between two sibling
 * elements.
 *
 * @param template - The host template (it reads props as `p['key']`).
 * @param component - The component class under test.
 * @param props - The props the template starts with.
 * @returns The mounted host and the props setter.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-storefront-spec-host',
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
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideRouter(createMemoryRouter({ initialEntries: ['/'] })),
    ],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    set: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

describe('StorefrontAnnouncementBar', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><div mol-storefront-announcement-bar [message]="p['message']">@if (p['on']) {<b slot="message" data-msg>Hi</b>}</div><i>b</i>`,
      StorefrontAnnouncementBar as Type<unknown>,
      { on: false },
    )
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    const bar = (): HTMLElement =>
      m.host.querySelector('div[mol-storefront-announcement-bar]') as HTMLElement
    // The host IS React's <div>; the message capture span never reaches the page.
    expect(tags()).toEqual(['i', 'div', 'i'])
    expect(bar().querySelector('span')).toBeNull()
    expect(bar().querySelector('[data-msg]')).toBeNull()
    m.set({ on: true })
    expect(bar().querySelector('[data-msg]')).not.toBeNull()
    expect(bar().querySelector('span')).toBeNull()
  })
})

describe('StorefrontFooter', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><footer mol-storefront-footer [brand]="p['brand']" [tagline]="p['tagline']">@if (p['on']) {<b slot="brand" data-brand>Brand</b>}</footer><i>b</i>`,
      StorefrontFooter as Type<unknown>,
      { on: false, tagline: 'A tagline' },
    )
    const tags = (): string[] => Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    const footer = (): HTMLElement =>
      m.host.querySelector('footer[mol-storefront-footer]') as HTMLElement
    // The host IS React's <footer>; the brand/tagline capture spans are gone.
    expect(tags()).toEqual(['i', 'footer', 'i'])
    expect(footer().querySelector('span')).toBeNull()
    expect(footer().querySelector('[data-brand]')).toBeNull()
    m.set({ on: true })
    expect(footer().querySelector('[data-brand]')).not.toBeNull()
    expect(footer().querySelector('span')).toBeNull()
  })
})
