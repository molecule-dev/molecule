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
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AngularBinding from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'
import { createMemoryRouter } from '@molecule/app-routing'
import type * as AppUiAngular from '@molecule/app-ui-angular'

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
// the same observable contracts the React suite's mocks have — plus the two
// node helpers the header renders link content with.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { ElementPropsWriter } = await importOriginal<typeof AppUiAngular>()
  const { Component, TemplateRef } = await import('@angular/core')
  return {
    ElementPropsWriter,
    asTemplate: (value: unknown) => (value instanceof TemplateRef ? value : null),
    cn: (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(' '),
    nodeText: (value: unknown) => {
      if (typeof value === 'string') return value
      if (typeof value === 'number') return String(value)
      return ''
    },
    styleText: (style: Record<string, unknown> | undefined | null) => {
      if (!style) return null
      const text = Object.entries(style)
        .filter(([, value]) => value != null && value !== false)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join('; ')
      return text || null
    },
    Flex: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
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
      changeDetection: ChangeDetectionStrategy.Eager,
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
// Every other export is the binding's own: the brand link is its real `Link` directive over a real
// memory router, and the components the header loads read the binding's other exports when defined.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { InjectionToken } = await import('@angular/core')
  return {
    ...actual,
    THEME_PROVIDER: new InjectionToken<unknown>('mock-theme-provider'),
    I18N_PROVIDER: new InjectionToken<unknown>('mock-i18n-provider'),
  }
})

const { AppHeader } = await import('../app-header.component.js')
const { I18N_PROVIDER, THEME_PROVIDER, provideRouter } = await import('@molecule/app-angular')

/** The host template for one AppHeader render: every React prop is bound. */
const headerTemplate = `<header mol-app-header
  [appName]="p()['appName']"
  [logoSrc]="p()['logoSrc']"
  [logoSize]="p()['logoSize']"
  [brandTo]="p()['brandTo']"
  [brandClassName]="p()['brandClassName']"
  [navigation]="p()['navigation']"
  [themeToggle]="p()['themeToggle']"
  [fixed]="p()['fixed']"
  [className]="p()['className']"
  [dataMolId]="p()['dataMolId']"
></header>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props into the host's bound props (a signal write) and re-renders. */
  setProps(patch: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p()['name']`.
 * @param providers - Extra environment providers (the theme/i18n tokens under test).
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  providers: (Provider | EnvironmentProviders)[] = [],
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
      readonly p = signal<Record<string, unknown>>(props)
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideRouter(createMemoryRouter({ initialEntries: ['/'] })),
      ...providers,
    ],
  })
  const ref: ComponentRef<{ p: WritableSignal<Record<string, unknown>> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: (patch) => {
      ref.instance.p.update((current) => ({ ...current, ...patch }))
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
  providers: (Provider | EnvironmentProviders)[] = [],
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
const withProviders = (): Provider[] => [
  { provide: THEME_PROVIDER, useValue: {} },
  { provide: I18N_PROVIDER, useValue: {} },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AppHeader', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of themeToggle', async () => {
    const m = await renderHeader(
      { appName: 'Field Notes', xs: [1, 3] },
      [],
      '@for (x of p()[\'xs\']; track x) {<b slot="themeToggle">{{ x }}</b>}',
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders the brand and each declared destination as links in the primary navigation landmark', async () => {
    const m = await renderHeader(
      {
        appName: 'Field Notes',
        brandClassName: 'wordmark',
        navigation: {
          label: 'Site',
          className: 'site-navigation',
          listClassName: 'site-links',
          itemClassName: 'site-link-item',
          links: {
            '/': { children: 'Home' },
            '/notebooks/42': {
              className: 'account-link',
              'aria-current': 'page',
              children: 'My notebook',
            },
          },
        },
      },
      [],
      '<button slot="extraActions" type="button">Preferences</button>',
    )
    const nav = m.host.querySelector('nav')
    if (!nav) throw new Error('no <nav> rendered')
    expect(nav.getAttribute('aria-label')).toBe('Site')
    expect(nav.getAttribute('class')).toContain('site-navigation')
    const brand = nav.querySelector('a[href="/"]')
    expect(brand?.getAttribute('class')).toBe('wordmark')
    const list = nav.querySelector('ul')
    expect(list?.getAttribute('class')).toBe('site-links')
    expect(nav.querySelectorAll('ul.site-links > li.site-link-item')).toHaveLength(2)
    expect(nav.querySelectorAll('a[href="/notebooks/42"]')).toHaveLength(1)
    const account = nav.querySelector('a.account-link')
    expect(account?.getAttribute('aria-current')).toBe('page')
    expect(account?.textContent).toContain('My notebook')
    expect(nav.querySelectorAll('a[href="/"]')).toHaveLength(2)
    expect(nav.textContent).toContain('Preferences')
  })

  it('applies every other anchor attribute from a link entry, and updates and removes it', async () => {
    const m = await renderHeader({
      appName: 'Field Notes',
      navigation: {
        label: 'Site',
        links: {
          '/docs': {
            children: 'Docs',
            className: 'docs-link',
            target: '_blank',
            rel: 'noreferrer',
            'aria-label': 'Open the docs',
            'data-analytics': 'docs-link',
          },
        },
      },
    })
    const link = m.host.querySelector('a[href="/docs"]')
    if (!link) throw new Error('no /docs link')
    expect(link.getAttribute('class')).toBe('docs-link')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
    expect(link.getAttribute('aria-label')).toBe('Open the docs')
    expect(link.getAttribute('data-analytics')).toBe('docs-link')
    m.setProps({
      navigation: {
        label: 'Site',
        links: { '/docs': { children: 'Docs', className: 'docs-link', download: true } },
      },
    })
    const updated = m.host.querySelector('a[href="/docs"]')
    if (!updated) throw new Error('no /docs link after update')
    expect(updated.getAttribute('rel')).toBeNull()
    expect(updated.getAttribute('target')).toBeNull()
    expect(updated.getAttribute('aria-label')).toBeNull()
    expect(updated.getAttribute('download')).toBe('')
  })

  it('renders a TemplateRef child as the link content', async () => {
    const m = await mount(
      `<header mol-app-header [appName]="'Field Notes'" [navigation]="{ label: 'Site', links: { '/notebooks/42': { children: content } } }"></header><ng-template #content><img alt="" src="/avatar.png" />My notebook</ng-template>`,
      AppHeader as Type<unknown>,
    )
    mounted.push(m)
    const link = m.host.querySelector('a[href="/notebooks/42"]')
    if (!link) throw new Error('no /notebooks/42 link')
    expect(link.querySelector('img')?.getAttribute('src')).toBe('/avatar.png')
    expect(link.textContent).toContain('My notebook')
  })

  it('renders numeric link content as text', async () => {
    const m = await renderHeader({
      appName: 'Field Notes',
      navigation: { label: 'Site', links: { '/inbox': { children: 7 } } },
    })
    const link = m.host.querySelector('a[href="/inbox"]')
    expect(link?.textContent).toBe('7')
  })

  it('navigates a link entry with replace and its state', async () => {
    const router = createMemoryRouter({ initialEntries: ['/settings'] })
    const m = await renderHeader(
      {
        appName: 'Field Notes',
        navigation: {
          label: 'Site',
          links: {
            '/notebooks/42': { children: 'Notebook', replace: true, state: { from: 'header' } },
          },
        },
      },
      [provideRouter(router)],
    )
    const link = m.host.querySelector('a[href="/notebooks/42"]')
    if (!link) throw new Error('no /notebooks/42 link')
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    expect(router.getLocation().pathname).toBe('/notebooks/42')
    expect(router.getLocation().state).toEqual({ from: 'header' })
    // A replace kept the single history entry: going back leaves the location in place.
    router.back()
    expect(router.getLocation().pathname).toBe('/notebooks/42')
  })

  it('pushes a link entry that does not set replace', async () => {
    const router = createMemoryRouter({ initialEntries: ['/settings'] })
    const m = await renderHeader(
      {
        appName: 'Field Notes',
        navigation: { label: 'Site', links: { '/notebooks/42': { children: 'Notebook' } } },
      },
      [provideRouter(router)],
    )
    const link = m.host.querySelector('a[href="/notebooks/42"]')
    if (!link) throw new Error('no /notebooks/42 link')
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    expect(router.getLocation().pathname).toBe('/notebooks/42')
    router.back()
    expect(router.getLocation().pathname).toBe('/settings')
  })

  it('runs an entry onClick before the router link, so preventDefault cancels navigation', async () => {
    const router = createMemoryRouter({ initialEntries: ['/settings'] })
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault())
    const m = await renderHeader(
      {
        appName: 'Field Notes',
        navigation: { label: 'Site', links: { '/docs': { children: 'Docs', onClick } } },
      },
      [provideRouter(router)],
    )
    const link = m.host.querySelector('a[href="/docs"]')
    if (!link) throw new Error('no /docs link')
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(router.getLocation().pathname).toBe('/settings')
  })

  it('keeps a brand-and-actions header without a primary navigation landmark', async () => {
    const m = await renderHeader(
      { appName: 'Field Notes' },
      [],
      '<button slot="extraActions" type="button">Preferences</button>',
    )
    expect(m.host.innerHTML).toContain('Field Notes')
    expect(m.host.innerHTML).toContain('Preferences')
    expect(m.host.innerHTML).not.toContain('<nav')
  })

  it('moves the header into the navigation landmark when navigation is set after mount', async () => {
    const m = await renderHeader(
      { appName: 'Field Notes' },
      [],
      '<button slot="extraActions" type="button">Preferences</button>',
    )
    expect(m.host.querySelector('nav')).toBeNull()
    m.setProps({ navigation: { label: 'Site', links: { '/': { children: 'Home' } } } })
    const nav = m.host.querySelector('nav')
    if (!nav) throw new Error('no <nav> rendered')
    expect(nav.getAttribute('aria-label')).toBe('Site')
    expect(nav.querySelectorAll('a[href="/"]')).toHaveLength(2)
    expect(nav.textContent).toContain('Preferences')
    // The projected action is bare, as React renders `{extraActions}`: no capture wrapper survives.
    expect(nav.querySelectorAll('span[data-mol-slot]')).toHaveLength(0)
  })

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

  it('shows and removes the extraActions wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await renderHeader(
      { appName: 'Acme', on: false },
      [],
      `@if (p()['on']) {<button slot="extraActions" type="button" data-extra>act</button>}`,
    )
    /** The action row's markup without Angular's comments and classes. */
    const row = (): string => {
      const slots = m.host.querySelectorAll('div[mol-flex]')
      const actionRow = slots[slots.length - 1]
      if (!actionRow) throw new Error('no action row rendered')
      return actionRow.innerHTML.replace(/<!--.*?-->/g, '').replace(/ class="[^"]*"/g, '')
    }
    expect(row()).toBe('')
    m.setProps({ on: true })
    expect(row()).toBe('<button slot="extraActions" type="button" data-extra="">act</button>')
    m.setProps({ on: false })
    expect(row()).toBe('')
  })

  it('renders the extra actions bare when they come through an OnPush component, in the pass where the consumer @if adds and removes its content', async () => {
    // No hook of the header runs here: the OnPush component in between is not checked when only the
    // consumer's @if changes. React has no such boundary; its actions follow the consumer's state.
    const Mid = Component({
      selector: 'mol-spec-onpush-mid',
      standalone: true,
      imports: [AppHeader as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<header mol-app-header [appName]="'Acme'"><ng-content select="[slot=extraActions]" ngProjectAs="[slot=extraActions]"></ng-content></header>`,
    })(class SpecOnPushMid {})
    const m = await mount(
      `<mol-spec-onpush-mid>@if (p()['on']) {<button slot="extraActions" type="button" data-extra>act</button>}</mol-spec-onpush-mid>`,
      Mid,
      { on: false },
    )
    mounted.push(m)
    const extra = (): HTMLElement | null => m.host.querySelector('[data-extra]')
    expect(extra()).toBeNull()
    m.setProps({ on: true })
    expect(extra()?.parentElement?.matches('div[mol-flex]')).toBe(true)
    m.setProps({ on: false })
    expect(extra()).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const content = `@if (p()['on']) {<button slot="extraActions" data-extra type="button">act</button>}`
    const template = `<i>a</i>${headerTemplate.replace('</header>', `${content}</header>`)}<i>b</i>`
    const m = await mount(
      template,
      AppHeader as Type<unknown>,
      { appName: 'Acme', on: true },
      withProviders(),
    )
    mounted.push(m)
    // The consumer's children are exactly React's: the two neighbours and the
    // header (its root, so the host element itself), with no extra host or capture.
    const shape = (): string =>
      Array.from(m.host.childNodes)
        .filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''),
        )
        .map((n) => (n.nodeType === 1 ? (n as Element).tagName : '#text'))
        .join(',')
    expect(shape()).toBe('I,HEADER,I')
    // Every capture span is out of the page; the action renders bare.
    expect(m.host.querySelectorAll('span[data-mol-slot]')).toHaveLength(0)
    expect(m.host.querySelector('[data-extra]')?.parentElement?.tagName).toBe('DIV')
    m.setProps({ on: false })
    expect(shape()).toBe('I,HEADER,I')
    expect(m.host.querySelector('[data-extra]')).toBeNull()
  })
})
