// @vitest-environment jsdom
/**
 * The Angular shells' own visible text goes through `t()` — a port of
 * `@molecule/app-nav-chrome-react/src/__tests__/nav-chrome-i18n.test.tsx`:
 * the same test names and assertions. The four `<nav>` landmark names are
 * user-visible text a screen reader announces, so each must reach the screen
 * through `t('navChrome.aria.<key>', undefined, { defaultValue })`. The test
 * mocks `useTranslation()` from `@molecule/app-angular` with a `t` that echoes
 * its key, so a label that bypassed `t` would render as plain English instead
 * of the marked key.
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

// Class tokens echo their own name, so the assertion reads the attribute alone.
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
// A `t` that echoes its key: a label that bypassed t() would show as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { AppShellBottomNav } = await import('../app-shell-bottom-nav.component.js')
const { AppShellFooter } = await import('../app-shell-footer.component.js')
const { AppShellSideNav } = await import('../app-shell-side-nav.component.js')
const { AppShellTopNav } = await import('../app-shell-top-nav.component.js')

const mounted: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const teardown of mounted.splice(0)) await teardown()
})

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @returns The host element and a teardown.
 */
async function render(template: string, component: Type<unknown>): Promise<{ host: HTMLElement }> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(class SpecHost {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push(async () => {
    appRef.destroy()
    host.remove()
  })
  return { host }
}

describe('AppShellBottomNav', () => {
  it('labels the bottom nav region through t()', async () => {
    const { host } = await render(
      `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a' }]"></nav>`,
      AppShellBottomNav,
    )
    expect(host.innerHTML).toContain('aria-label="«navChrome.aria.bottom»"')
  })
})

describe('AppShellFooter', () => {
  it('labels the footer links region through t()', async () => {
    const { host } = await render(
      `<footer mol-nav-footer [links]="[{ label: 'Privacy', to: '/privacy' }]"></footer>`,
      AppShellFooter,
    )
    expect(host.innerHTML).toContain('aria-label="«navChrome.aria.footer»"')
  })
})

describe('AppShellSideNav', () => {
  it('labels the side nav region through t()', async () => {
    const { host } = await render(
      `<aside mol-nav-side [items]="[{ id: 'a', label: 'label-a' }]"></aside>`,
      AppShellSideNav,
    )
    expect(host.innerHTML).toContain('aria-label="«navChrome.aria.sidebar»"')
  })
})

describe('AppShellTopNav', () => {
  it('labels the top nav region through t()', async () => {
    const { host } = await render(
      `<header mol-nav-top [items]="[{ id: 'a', label: 'label-a' }]"></header>`,
      AppShellTopNav,
    )
    expect(host.innerHTML).toContain('aria-label="«navChrome.aria.main»"')
  })
})
