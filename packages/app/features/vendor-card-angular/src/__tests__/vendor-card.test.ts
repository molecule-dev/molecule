// @vitest-environment jsdom
/**
 * Unit tests of `VendorCard` — the port of
 * `@molecule/app-vendor-card-react/src/__tests__/vendor-card.test.tsx`. The
 * React suite renders the component with mocked UI packages and asserts the
 * markup; this port mounts the same tree through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) with the same UI-package stubs, and asserts the same
 * markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  // The same stubs the React tests install for `@molecule/app-ui-react`:
  // an `<img data-avatar data-avatar-name>` and a `<div data-card>` wrapper.
  // The `Component(...)` factory is called as a plain function (no decorator
  // syntax) so the hoisted mock factory stays plain JavaScript.
  const Avatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'name'],
    template: `<img [attr.data-avatar]="src || ''" [attr.data-avatar-name]="name || ''" />`,
  })(
    class {
      /** Image source (input `src`) — undefined until Angular assigns the binding. */
      src?: string
      /** Display name (input `name`) — undefined until Angular assigns the binding. */
      name?: string
    },
  )
  const Card = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-card]',
    standalone: true,
  })(class {})
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar, Card }
})

const { VendorCard } = await import('../vendor-card.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the VendorCard through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @param projected - Extra projected content (e.g. a `[slot=badges]` element).
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [VendorCard as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-vendor-card [name]="p['name']" [logoSrc]="p['logoSrc']" [description]="p['description']" [rating]="p['rating']" [reviewCount]="p['reviewCount']" [memberSince]="p['memberSince']" [badges]="p['badges']" [actions]="p['actions']" [className]="p['className']">${projected}</div>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('VendorCard', () => {
  it('renders the name in an <h3> and the avatar', async () => {
    const m = await render({ name: 'Acme Supplies' })
    const markup = m.host.innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Acme Supplies')
    expect(markup).toContain('data-avatar-name="Acme Supplies"')
  })

  it('renders the description when present', async () => {
    const m = await render({ name: 'V', description: 'Trusted parts seller' })
    expect(m.host.innerHTML).toContain('Trusted parts seller')
  })

  it('renders the rating (1 decimal) and review count when present', async () => {
    const m = await render({ name: 'V', rating: 4.7, reviewCount: 312 })
    const markup = m.host.innerHTML
    expect(markup).toContain('4.7')
    expect(markup).toContain('(312)')
  })

  it('renders the memberSince line', async () => {
    const m = await render({ name: 'V', memberSince: 'since 2019' })
    expect(m.host.innerHTML).toContain('since 2019')
  })

  it('renders the badges and actions slots', async () => {
    const m = await render(
      { name: 'V' },
      `<span slot="badges" data-badges></span><button slot="actions" data-actions></button>`,
    )
    const markup = m.host.innerHTML
    expect(markup).toContain('data-badges=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', async () => {
    const m = await render({ name: 'V', className: 'vc-cls' })
    expect(m.host.innerHTML).toContain('vc-cls')
  })
})
