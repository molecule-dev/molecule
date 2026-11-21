// @vitest-environment jsdom
/**
 * Unit tests of the Angular settings-page scaffold — the port of
 * `@molecule/app-settings-container-react`'s own suite. The React suite renders
 * the components with a mocked ClassMap and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavior.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
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

const { SettingsContent } = await import('../settings-content.component.js')
const { SettingsLayout } = await import('../settings-layout.component.js')
const { SettingsSection } = await import('../settings-section.component.js')
const { SettingsSidebar } = await import('../settings-sidebar.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
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
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement, selector: string): string => {
  const el = host.querySelector(selector)
  if (!el) throw new Error(`no ${selector} host rendered`)
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`.replace(' ="', '="')
}

const mounted: Mounted[] = []

/**
 * Mounts a component and remembers it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class.
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

/** The settings-layout host template. */
const layoutTemplate = (content: string): string =>
  `<div mol-settings-layout [header]="p['header']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SettingsContent', () => {
  it('renders its children', async () => {
    const m = await render(
      `<div mol-settings-content [className]="p['className']"><div data-c></div></div>`,
      SettingsContent as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-c')
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-settings-content [className]="p['className']">x</div>`,
      SettingsContent as Type<unknown>,
      { className: 'ct-cls' },
    )
    expect(openTag(m.host, '[mol-settings-content]')).toContain('ct-cls')
  })
})

describe('SettingsLayout', () => {
  it('renders the sidebar slot', async () => {
    const m = await render(
      layoutTemplate(`<div slot="sidebar" data-sidebar></div>`),
      SettingsLayout as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-sidebar')
  })

  it('renders the content children', async () => {
    const m = await render(
      layoutTemplate(`<div data-content></div>`),
      SettingsLayout as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-content')
  })

  it('renders the header when given and omits it otherwise', async () => {
    const withHeader = await render(
      layoutTemplate(`<div slot="header" data-header></div>`),
      SettingsLayout as Type<unknown>,
    )
    expect(withHeader.host.innerHTML).toContain('data-header')
    const without = await render(layoutTemplate(`x`), SettingsLayout as Type<unknown>)
    expect(without.host.querySelector('[data-header]')).toBeNull()
  })

  it('sets data-mol-id and forwards className on the outer wrapper', async () => {
    const m = await render(layoutTemplate(`x`), SettingsLayout as Type<unknown>, {
      dataMolId: 'settings-x',
      className: 'lay-cls',
    })
    const tag = openTag(m.host, '[mol-settings-layout]')
    expect(tag).toContain('data-mol-id="settings-x"')
    expect(tag).toContain('lay-cls')
  })
})

describe('SettingsSection', () => {
  /** The settings-section host template. */
  const sectionTemplate = (content: string): string =>
    `<div mol-settings-section [title]="p['title']" [description]="p['description']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`

  it('renders the title inside an <h2>', async () => {
    const m = await render(sectionTemplate(``), SettingsSection as Type<unknown>, {
      title: 'Profile',
    })
    expect(m.host.innerHTML).toContain('<h2')
    expect(m.host.innerHTML).toContain('Profile')
  })

  it('renders the description when present and omits it otherwise', async () => {
    const withDesc = await render(sectionTemplate(``), SettingsSection as Type<unknown>, {
      title: 'T',
      description: 'desc-x',
    })
    expect(withDesc.host.innerHTML).toContain('desc-x')
    const without = await render(sectionTemplate(``), SettingsSection as Type<unknown>, {
      title: 'T',
    })
    expect(without.host.querySelector('p')).toBeNull()
  })

  it('renders its children', async () => {
    const m = await render(
      sectionTemplate(`<div data-body></div>`),
      SettingsSection as Type<unknown>,
      { title: 'T' },
    )
    expect(m.host.innerHTML).toContain('data-body')
  })

  it('renders the footer when present and omits it otherwise', async () => {
    const withFooter = await render(
      sectionTemplate(`<button slot="footer" data-footer></button>`),
      SettingsSection as Type<unknown>,
      { title: 'T' },
    )
    expect(withFooter.host.innerHTML).toContain('data-footer')
    expect(withFooter.host.querySelector('footer')).not.toBeNull()
    const without = await render(sectionTemplate(``), SettingsSection as Type<unknown>, {
      title: 'T',
    })
    expect(without.host.querySelector('footer')).toBeNull()
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render(sectionTemplate(``), SettingsSection as Type<unknown>, {
      title: 'T',
      dataMolId: 'sec-x',
      className: 'sec-cls',
    })
    const tag = openTag(m.host, '[mol-settings-section]')
    expect(tag).toContain('data-mol-id="sec-x"')
    expect(tag).toContain('sec-cls')
  })
})

describe('SettingsSidebar', () => {
  const items = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
  ]

  /** The settings-sidebar host template. */
  const sidebarTemplate = (content = ''): string =>
    `<nav mol-settings-sidebar [items]="p['items']" [activeId]="p['activeId']" [onSelect]="p['onSelect']" [className]="p['className']">${content}</nav>`

  it('renders every item label', async () => {
    const m = await render(sidebarTemplate(), SettingsSidebar as Type<unknown>, {
      items,
      activeId: 'profile',
      onSelect: () => {},
    })
    expect(m.host.innerHTML).toContain('Profile')
    expect(m.host.innerHTML).toContain('Billing')
  })

  it('renders item icons', async () => {
    // A text icon is the input form of Angular's node-valued data prop; the
    // projected-template form (`{ $nodes }`) is proven by the conformance suite.
    const m = await render(sidebarTemplate(), SettingsSidebar as Type<unknown>, {
      items: [{ id: 'a', label: 'A', icon: '★' }],
      activeId: 'a',
      onSelect: () => {},
    })
    expect(m.host.querySelector('button')?.textContent).toContain('★')
  })

  it('marks only the active item with aria-current="page"', async () => {
    const m = await render(sidebarTemplate(), SettingsSidebar as Type<unknown>, {
      items,
      activeId: 'billing',
      onSelect: () => {},
    })
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the footer when given', async () => {
    const m = await render(
      sidebarTemplate(`<div slot="footer" data-footer></div>`),
      SettingsSidebar as Type<unknown>,
      { items, activeId: 'profile', onSelect: () => {} },
    )
    expect(m.host.innerHTML).toContain('data-footer')
  })

  it('labels the nav region "Settings" and forwards className', async () => {
    const m = await render(sidebarTemplate(), SettingsSidebar as Type<unknown>, {
      items,
      activeId: 'profile',
      onSelect: () => {},
      className: 'sb-cls',
    })
    const tag = openTag(m.host, '[mol-settings-sidebar]')
    expect(tag).toContain('aria-label="Settings"')
    expect(tag).toContain('sb-cls')
  })
})
