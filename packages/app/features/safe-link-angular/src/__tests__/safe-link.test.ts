// @vitest-environment jsdom
/**
 * Unit tests of `SafeLink` — a port of
 * `@molecule/app-safe-link-react/src/__tests__/SafeLink.test.tsx`: the same
 * behavioral assertions, rendered with Angular's real renderer over a real
 * memory router (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserted on the markup the
 * component produces.
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
import { afterEach, describe, expect, it } from 'vitest'

import { provideRouter } from '@molecule/app-angular'
import { createMemoryRouter } from '@molecule/app-routing'

import { SafeLink } from '../safe-link.component.js'

/** A mounted SafeLink over one memory router. */
interface Mounted {
  /** The host element whose template the component's host anchor lives in. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts `SafeLink` through a JIT host template — written exactly the way an
 * Angular app would write it — inside the router registration's scope.
 *
 * @param currentPath - The route the memory router starts at.
 * @param props - The link's props (`to`, plus `className` where a case needs it).
 * @param children - The link's projected content (default `'link'`, as in the React suite).
 * @returns The mounted host.
 */
async function renderAt(
  currentPath: string,
  props: { to: string; className?: string },
  children?: string,
): Promise<Mounted> {
  const router = createMemoryRouter({ initialEntries: [currentPath] })
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SafeLink],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<a mol-safe-link [to]="p['to']" [replace]="p['replace']" [state]="p['state']" [className]="p['className']">${children ?? 'link'}</a>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideRouter(router)],
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

/** The anchor the component's host element is. */
const anchorOf = (mounted: Mounted): HTMLAnchorElement => {
  const el = mounted.host.querySelector('a')
  if (!el) throw new Error('no SafeLink anchor rendered')
  return el
}

/** Pull the `href` attribute out of the single anchor in the markup. */
const hrefOf = (mounted: Mounted): string | null => anchorOf(mounted).getAttribute('href')

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('SafeLink', () => {
  it('renders an anchor with the children as content', async () => {
    const m = await renderAt('/dashboard', { to: '/settings' }, 'Settings')
    mounted.push(m)
    const html = anchorOf(m).outerHTML
    expect(html).toContain('<a')
    expect(html).toContain('>Settings</a>')
  })

  it('leaves the href untouched when target differs from the current path', async () => {
    const m = await renderAt('/dashboard', { to: '/settings' })
    mounted.push(m)
    expect(hrefOf(m)).toBe('/settings')
  })

  it('appends #top when target exactly matches the current path', async () => {
    const m = await renderAt('/settings', { to: '/settings' })
    mounted.push(m)
    expect(hrefOf(m)).toBe('/settings#top')
  })

  it('treats current path + trailing slash as a same-path match', async () => {
    // location.pathname === '/settings', to === '/settings/' → samePath via
    // the `pathname + '/' === to` branch; trailing slash is stripped before #top.
    const m = await renderAt('/settings', { to: '/settings/' })
    mounted.push(m)
    expect(hrefOf(m)).toBe('/settings#top')
  })

  it('strips a trailing slash from the target before appending #top', async () => {
    const m = await renderAt('/blog/', { to: '/blog/' })
    mounted.push(m)
    expect(hrefOf(m)).toBe('/blog#top')
  })

  it('does not match when only a path prefix overlaps', async () => {
    const m = await renderAt('/settings', { to: '/settings/profile' })
    mounted.push(m)
    expect(hrefOf(m)).toBe('/settings/profile')
  })

  it('forwards arbitrary anchor props (className, etc.) to the underlying Link', async () => {
    const m = await renderAt('/x', { to: '/y', className: 'nav-item' }, 'Y')
    mounted.push(m)
    expect(anchorOf(m).getAttribute('class')).toBe('nav-item')
  })

  it('exposes a default export equal to the named export', async () => {
    const mod = await import('../safe-link.component.js')
    expect(mod.default).toBe(mod.SafeLink)
  })
})
