// @vitest-environment jsdom
/**
 * PageHeader names its breadcrumb `<nav>` landmark through `t()` (the way
 * Modal names its close button), so a screen reader announces it in the
 * active language instead of hardcoded English. Rendered through Angular's
 * real renderer (`createApplication` + `createComponent`, as the conformance
 * kit's Angular adapter does) with `@molecule/app-angular` stubbed.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { createComponent, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideMolecule } from '@molecule/app-angular'
import { createMemoryRouter } from '@molecule/app-routing'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        // PageHeader calls `cm().flex({ justify, align })`; every other token
        // is read as a plain string (`[class]="cm().pageHeader"`), which is
        // what Angular's class-map binding requires.
        if (prop === 'flex') {
          return () => 'flex'
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

// A provider whose `t` marks the key it was asked for, so the assertion sees
// the key PageHeader renders with, not a translated string.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `⟦${key}⟧`,
  }),
}))

const { PageHeader } = await import('../components/page-header.component.js')

const apps: Array<{ destroy: () => void }> = []

afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.innerHTML = ''
})

describe('PageHeader breadcrumb landmark', () => {
  it('PageHeader names its breadcrumb landmark through t()', async () => {
    // A breadcrumb with an href is a router link, which an app always mounts inside its router.
    const appRef = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideDomPlacement(),
        provideMolecule({ router: createMemoryRouter({ initialEntries: ['/reports'] }) }),
      ],
    })
    apps.push(appRef)
    const ref = createComponent(PageHeader, { environmentInjector: appRef.injector })
    document.body.appendChild(ref.location.nativeElement as HTMLElement)
    appRef.attachView(ref.hostView)
    ref.setInput('title', 'Dashboard')
    ref.setInput('breadcrumbs', [{ label: 'Home', href: '/' }, { label: 'Reports' }])
    appRef.tick()
    const nav = (ref.location.nativeElement as HTMLElement).querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute('aria-label')).toBe('⟦ui.pageHeader.breadcrumbs⟧')
  })
})
