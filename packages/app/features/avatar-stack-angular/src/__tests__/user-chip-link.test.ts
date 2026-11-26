// @vitest-environment jsdom
/**
 * Angular `UserChip` link tests — the port of
 * `@molecule/app-avatar-stack-react/src/__tests__/user-chip-link.test.tsx`: the
 * same behavioral assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the port's own suite uses) and
 * asserted on the markup it produces. Only the styling bond and `Avatar` are
 * substituted, as in the React suite.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond.
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

// `Avatar` is the only `@molecule/app-ui-angular` component dependency — stub
// it to an inspectable `<img>` carrying the supplied src + name, the same
// marker the React suite's `@molecule/app-ui-react` stub renders. Everything
// else (`styleText`, `ElementPropsWriter`) is the real bundle.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { Component } = await import('@angular/core')
  const MockAvatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'alt', 'name', 'size'],
    template: '<img [attr.src]="src" [attr.data-avatar-name]="name" />',
  })(
    class AvatarStub {
      /** Image source. */
      src?: string
      /** Alt text. */
      alt?: string
      /** Display name. */
      name?: string
      /** Size preset. */
      size?: unknown
    },
  )
  return { ...actual, Avatar: MockAvatar }
})

const { UserChip } = await import('../user-chip.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Mounts one `<div mol-user-chip>` through the given host template. */
const renderChip = async (
  template: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, UserChip as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const chipTemplate = `<div mol-user-chip [name]="p['name']" [src]="p['src']" [href]="p['href']" [nameLinkProps]="p['nameLinkProps']"></div>`

describe('linked user identities', () => {
  it('renders one canonical name link per byline, with the avatar outside it', async () => {
    const m = await renderChip(chipTemplate, {
      name: 'Maintenance lead',
      src: '/crew.png',
      href: '/crew/lead',
      nameLinkProps: { className: 'person-name' },
    })
    const html = m.host.innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(1)
    expect(html.match(/class="[^"]*person-name[^"]*"/g)).toHaveLength(1)
    expect(html).toContain('href="/crew/lead"')
    expect(html).toMatch(/<a\b[^>]*>Maintenance lead<\/a>/)
    // The avatar renders once, and never inside the link.
    expect(m.host.querySelectorAll('img')).toHaveLength(1)
    expect(m.host.querySelector('a')?.querySelector('img')).toBeNull()
  })

  it('keeps an action and subtitle outside the identity link', async () => {
    const m = await renderChip(
      `<div mol-user-chip [name]="p['name']" [href]="p['href']" [subtitle]="p['subtitle']"><button slot="trailing" type="button">Assign</button></div>`,
      { name: 'Lead', href: '/crew/lead', subtitle: 'Night shift' },
    )
    const html = m.host.innerHTML
    expect(html).toContain('Night shift')
    // The projected action keeps the `slot="trailing"` marker the projection
    // selector needs; React's node carries none. Order and containment are the
    // assertion: the action renders after the link and never inside it.
    expect(html).toMatch(/<\/a>[^]*?<button\b[^>]*type="button"[^>]*>Assign<\/button>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<button[^]*?<\/a>/)
  })

  it('supports independent copies in a header and footer without suppressing either', async () => {
    const m = await renderChip(
      `<main><header><div mol-user-chip [name]="p['name']" [href]="p['href']"></div></header><footer><div mol-user-chip [name]="p['name']" [href]="p['href']"></div></footer></main>`,
      { name: 'Lead', href: '/crew/lead' },
    )
    const html = m.host.innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(2)
    expect(html).toMatch(/<header>[^]*?<a\b[^]*?<\/header>/)
    expect(html).toMatch(/<footer>[^]*?<a\b[^]*?<\/footer>/)
  })

  it('preserves an unlinked identity, forwarded attributes and escaped display names', async () => {
    const m = await renderChip(
      `<div mol-user-chip [name]="p['name']" [title]="p['title']" [id]="p['id']"></div>`,
      { name: '<Lead & crew>', title: 'Assignment', id: 'crew-row' },
    )
    const html = m.host.innerHTML
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;Lead &amp; crew&gt;')
    expect(html).toContain('title="Assignment"')
    expect(html).toContain('id="crew-row"')
  })

  it('forwards router and link attributes to the canonical name link', async () => {
    const onClick = vi.fn()
    const m = await renderChip(chipTemplate, {
      name: 'Lead',
      href: '/crew/lead',
      nameLinkProps: { onClick, target: '_blank', rel: 'noreferrer' },
    })
    const link = m.host.querySelector('a')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noreferrer')
    expect(link?.getAttribute('href')).toBe('/crew/lead')
    link?.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
