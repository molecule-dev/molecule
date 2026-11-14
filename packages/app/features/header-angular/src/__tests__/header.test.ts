// @vitest-environment jsdom
/**
 * Unit tests of `AppHeader` — the port of `@molecule/app-header-react`'s own
 * suite. The React suite renders the component with mocked UI dependencies
 * and real contexts so the header's default theme-toggle can probe provider
 * presence; this port mounts the same mocked tree through Angular's real
 * renderer (the `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses), providing or omitting the binding's theme/i18n
 * tokens exactly where the React suite wrapped or omitted its providers.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AngularBinding from '@molecule/app-angular'
import { createMemoryRouter } from '@molecule/app-routing'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `headerBar`),
// so tests can assert which cm.* class was applied without a real bond.
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

// The UI components AppHeader composes, each rendering one marked element —
// the same observable contracts the React suite's mocks have.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Flex: Component({
      selector: 'div[mol-flex]',
      standalone: true,
      inputs: ['direction', 'justify', 'align', 'wrap', 'gap', 'className', 'style', 'testId'],
      host: { 'data-flex': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockFlex {
        /** Flex direction. */
        direction?: string
        /** Main-axis justification. */
        justify?: string
        /** Cross-axis alignment. */
        align?: string
        /** Wrapping behavior. */
        wrap?: string
        /** Gap. */
        gap?: number | string
        /** Extra classes. */
        className?: string
        /** Inline style object. */
        style?: Record<string, unknown>
        /** `data-testid`. */
        testId?: string
      },
    ),
    ThemeToggle: Component({
      selector: 'button[mol-theme-toggle]',
      standalone: true,
      host: { type: 'button', 'data-theme-toggle': '' },
      template: '',
    })(
      class MockThemeToggle {
        /** Extra classes. */
        className?: string
      },
    ),
  }
})

// Real injection tokens so the header's default theme-toggle can probe for
// provider presence. `inject(TOKEN, { optional: true })` returns null when a
// provider is absent (it does NOT throw), which is exactly what makes the
// header degrade gracefully instead of crashing the real ThemeToggle.
// The brand link is the binding's real `Link` directive over a real memory router.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { InjectionToken } = await import('@angular/core')
  return {
    THEME_PROVIDER: new InjectionToken<unknown>('mock-theme-provider'),
    I18N_PROVIDER: new InjectionToken<unknown>('mock-i18n-provider'),
    Link: actual.Link,
    provideRouter: actual.provideRouter,
  }
})

const { AppHeader } = await import('../app-header.component.js')
const { I18N_PROVIDER, THEME_PROVIDER, provideRouter } = await import('@molecule/app-angular')

/** The host template for one AppHeader render: every React prop is bound. */
const headerTemplate = `<header mol-app-header
  [appName]="p['appName']"
  [logoSrc]="p['logoSrc']"
  [logoSize]="p['logoSize']"
  [brandTo]="p['brandTo']"
  [themeToggle]="p['themeToggle']"
  [fixed]="p['fixed']"
  [className]="p['className']"
  [dataMolId]="p['dataMolId']"
></header>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
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
 * @param providers - Extra environment providers (the theme/i18n tokens under test).
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  providers: unknown[] = [],
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
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
      provideRouter(createMemoryRouter({ initialEntries: ['/'] })),
      ...providers,
    ],
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
 * Renders AppHeader with the given props (projected slot content goes into
 * the template string), once per call, tracked for teardown.
 *
 * @param props - The props to bind.
 * @param providers - The theme/i18n providers to mount above the header.
 * @param slotContent - Extra projected content inside the header element.
 * @returns The mounted host.
 */
async function renderHeader(
  props: Record<string, unknown> = {},
  providers: unknown[] = [],
  slotContent = '',
): Promise<Mounted> {
  const m = await mount(
    `${headerTemplate.replace('</header>', `${slotContent}</header>`)}`,
    AppHeader as Type<unknown>,
    props,
    providers,
  )
  mounted.push(m)
  return m
}

/** The theme and i18n providers together — the state a real wired app has. */
const withProviders = (): unknown[] => [
  { provide: THEME_PROVIDER, useValue: {} },
  { provide: I18N_PROVIDER, useValue: {} },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AppHeader', () => {
  it('renders the appName and the logo image', async () => {
    const m = await renderHeader({ appName: 'Acme' })
    expect(m.host.innerHTML).toContain('Acme')
    expect(m.host.querySelector('img')).not.toBeNull()
    expect(m.host.innerHTML).toContain('src="/logo.svg"')
  })

  it('honours a custom logoSrc and logoSize', async () => {
    const m = await renderHeader({ appName: 'Acme', logoSrc: '/brand.png', logoSize: 48 })
    expect(m.host.innerHTML).toContain('src="/brand.png"')
    expect(m.host.innerHTML).toContain('width="48"')
  })

  it('links the brand to "/" by default and to a custom brandTo', async () => {
    const def = await renderHeader({ appName: 'Acme' })
    expect(def.host.innerHTML).toContain('href="/"')
    const custom = await renderHeader({ appName: 'Acme', brandTo: '/home' })
    expect(custom.host.innerHTML).toContain('href="/home"')
  })

  it('mounts without Theme/I18n providers WITHOUT throwing', async () => {
    const m = await renderHeader({ appName: 'Acme' })
    // The header still renders (brand is present) — it just degrades the toggle.
    expect(m.host.innerHTML).toContain('Acme')
  })

  it('omits the default theme toggle when Theme/I18n providers are absent', async () => {
    const m = await renderHeader({ appName: 'Acme' })
    expect(m.host.innerHTML).not.toContain('data-theme-toggle')
  })

  it('omits the default toggle when only ONE of the two providers is present', async () => {
    const onlyTheme = await renderHeader({ appName: 'Acme' }, [
      { provide: THEME_PROVIDER, useValue: {} },
    ])
    expect(onlyTheme.host.innerHTML).not.toContain('data-theme-toggle')
    const onlyI18n = await renderHeader({ appName: 'Acme' }, [
      { provide: I18N_PROVIDER, useValue: {} },
    ])
    expect(onlyI18n.host.innerHTML).not.toContain('data-theme-toggle')
  })

  it('renders the default theme toggle once BOTH providers are mounted', async () => {
    const m = await renderHeader({ appName: 'Acme' }, withProviders())
    expect(m.host.innerHTML).toContain('data-theme-toggle')
  })

  it('hides the toggle when themeToggle is null even with providers, and honours a custom node', async () => {
    const hidden = await renderHeader({ appName: 'Acme', themeToggle: null }, withProviders())
    expect(hidden.host.innerHTML).not.toContain('data-theme-toggle')
    const custom = await renderHeader(
      { appName: 'Acme' },
      [],
      '<span slot="themeToggle" data-custom-toggle></span>',
    )
    expect(custom.host.innerHTML).toContain('data-custom-toggle')
  })

  it('renders the documented UserMenu-as-userMenu composition (children API, no renderPanel)', async () => {
    // Mirrors the module @example: UserMenu receives its settings panel as
    // CHILDREN — proving the documented prop shape is the real one.
    const m = await renderHeader(
      { appName: 'Bearing' },
      [],
      '<div slot="userMenu" data-user-menu><div data-settings-panel>Settings</div></div>',
    )
    expect(m.host.innerHTML).toContain('data-user-menu')
    expect(m.host.innerHTML).toContain('data-settings-panel')
  })

  it('renders the userMenu and extraActions slots', async () => {
    const m = await renderHeader(
      { appName: 'Acme' },
      [],
      '<div slot="userMenu" data-user-menu></div><div slot="extraActions" data-extra></div>',
    )
    expect(m.host.innerHTML).toContain('data-user-menu')
    expect(m.host.innerHTML).toContain('data-extra')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await renderHeader({ appName: 'Acme', dataMolId: 'hdr-x', className: 'hdr-cls' })
    const header = m.host.querySelector('header')
    if (!header) throw new Error('no <header> rendered')
    expect(header.getAttribute('data-mol-id')).toBe('hdr-x')
    expect(header.getAttribute('class')).toContain('hdr-cls')
  })
})
