// @vitest-environment jsdom
/**
 * Unit tests for the Angular nav-chrome shells — a port of
 * `@molecule/app-nav-chrome-react`'s own suite: the same behavioral
 * assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserted on the markup the components produce.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

const { AppShellBottomNav } = await import('../app-shell-bottom-nav.component.js')
const { AppShellFooter } = await import('../app-shell-footer.component.js')
const { AppShellSideNav } = await import('../app-shell-side-nav.component.js')
const { AppShellTopNav } = await import('../app-shell-top-nav.component.js')

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

const mounted: Mounted[] = []

const render = async (template: string, component: Type<unknown>): Promise<Mounted> => {
  const m = await mount(template, component)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AppShellBottomNav', () => {
  it('renders every item label', async () => {
    const m = await render(
      `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]"></nav>`,
      AppShellBottomNav,
    )
    expect(m.host.innerHTML).toContain('label-a')
    expect(m.host.innerHTML).toContain('label-b')
  })

  it('renders item icons', async () => {
    const m = await render(
      `<ng-template #iconA><i data-icon></i></ng-template><nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a', icon: iconA }]"></nav>`,
      AppShellBottomNav,
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
  })

  it('marks the active item with aria-current="page"', async () => {
    const m = await render(
      `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]" activeId="b"></nav>`,
      AppShellBottomNav,
    )
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables an item flagged disabled', async () => {
    const m = await render(
      `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a', disabled: true }]"></nav>`,
      AppShellBottomNav,
    )
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('labels the nav region "Bottom" and forwards className', async () => {
    const m = await render(
      `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a' }]" className="bn-cls"></nav>`,
      AppShellBottomNav,
    )
    expect(m.host.innerHTML).toContain('aria-label="Bottom"')
    expect(m.host.innerHTML).toContain('bn-cls')
  })
})

describe('AppShellFooter', () => {
  it('renders the logo and copyright', async () => {
    const m = await render(
      `<footer mol-nav-footer copyright="© 2026 Acme"><span slot="logo" data-logo></span></footer>`,
      AppShellFooter,
    )
    expect(m.host.innerHTML).toContain('data-logo=""')
    expect(m.host.innerHTML).toContain('© 2026 Acme')
  })

  it('renders links with their hrefs, falling back to "#" when no `to`', async () => {
    const m = await render(
      `<footer mol-nav-footer [links]="[{ label: 'Privacy', to: '/privacy' }, { label: 'Terms' }]"></footer>`,
      AppShellFooter,
    )
    expect(m.host.innerHTML).toContain('href="/privacy"')
    expect(m.host.innerHTML).toContain('Privacy')
    expect(m.host.innerHTML).toContain('href="#"')
    expect(m.host.innerHTML).toContain('Terms')
  })

  it('omits the footer nav when links is empty or absent', async () => {
    const empty = await render(`<footer mol-nav-footer [links]="[]"></footer>`, AppShellFooter)
    expect(empty.host.innerHTML).not.toContain('aria-label="Footer"')
    const absent = await render(`<footer mol-nav-footer></footer>`, AppShellFooter)
    expect(absent.host.innerHTML).not.toContain('aria-label="Footer"')
  })

  it('renders the right slot', async () => {
    const m = await render(
      `<footer mol-nav-footer><span slot="right" data-right></span></footer>`,
      AppShellFooter,
    )
    expect(m.host.innerHTML).toContain('data-right=""')
  })

  it('forwards className onto the <footer>', async () => {
    const m = await render(`<footer mol-nav-footer className="ft-cls"></footer>`, AppShellFooter)
    expect(m.host.innerHTML).toContain('ft-cls')
  })
})

describe('AppShellSideNav', () => {
  it('renders a flat list of items', async () => {
    const m = await render(
      `<aside mol-nav-side [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]"></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML).toContain('label-a')
    expect(m.host.innerHTML).toContain('label-b')
  })

  it('renders grouped items with their headings', async () => {
    const m = await render(
      `<aside mol-nav-side [groups]="[{ id: 'g1', heading: 'Main', items: [{ id: 'a', label: 'label-a' }] }, { id: 'g2', heading: 'Settings', items: [{ id: 'b', label: 'label-b' }] }]"></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML).toContain('Main')
    expect(m.host.innerHTML).toContain('Settings')
    expect(m.host.innerHTML).toContain('label-a')
    expect(m.host.innerHTML).toContain('label-b')
  })

  it('marks the active item with aria-current="page"', async () => {
    const m = await render(
      `<aside mol-nav-side [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]" activeId="a"></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', async () => {
    const m = await render(
      `<ng-template #badge><span data-badge></span></ng-template><aside mol-nav-side [items]="[{ id: 'a', label: 'label-a', badge: badge }]"></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML).toContain('data-badge=""')
  })

  it('renders the header and footer slots', async () => {
    const m = await render(
      `<aside mol-nav-side [items]="[{ id: 'a', label: 'label-a' }]"><div slot="header" data-header></div><div slot="footer" data-footer></div></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML).toContain('data-header=""')
    expect(m.host.innerHTML).toContain('data-footer=""')
  })

  it('labels the nav region "Sidebar" and forwards className', async () => {
    const m = await render(
      `<aside mol-nav-side [items]="[{ id: 'a', label: 'label-a' }]" className="sn-cls"></aside>`,
      AppShellSideNav,
    )
    expect(m.host.innerHTML).toContain('aria-label="Sidebar"')
    expect(m.host.innerHTML).toContain('sn-cls')
  })
})

describe('AppShellTopNav', () => {
  it('renders the logo', async () => {
    const m = await render(
      `<header mol-nav-top><span slot="logo" data-logo></span></header>`,
      AppShellTopNav,
    )
    expect(m.host.innerHTML).toContain('data-logo=""')
  })

  it('renders nav items with labels', async () => {
    const m = await render(
      `<header mol-nav-top [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]"></header>`,
      AppShellTopNav,
    )
    expect(m.host.innerHTML).toContain('label-a')
    expect(m.host.innerHTML).toContain('label-b')
  })

  it('omits the centre nav when items is empty or absent', async () => {
    const empty = await render(`<header mol-nav-top [items]="[]"></header>`, AppShellTopNav)
    expect(empty.host.innerHTML).not.toContain('aria-label="Main"')
    const absent = await render(`<header mol-nav-top></header>`, AppShellTopNav)
    expect(absent.host.innerHTML).not.toContain('aria-label="Main"')
  })

  it('marks the active item with aria-current="page"', async () => {
    const m = await render(
      `<header mol-nav-top [items]="[{ id: 'a', label: 'label-a' }, { id: 'b', label: 'label-b' }]" activeId="b"></header>`,
      AppShellTopNav,
    )
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the item badge', async () => {
    const m = await render(
      `<ng-template #badge><span data-badge></span></ng-template><header mol-nav-top [items]="[{ id: 'a', label: 'label-a', badge: badge }]"></header>`,
      AppShellTopNav,
    )
    expect(m.host.innerHTML).toContain('data-badge=""')
  })

  it('renders the right slot', async () => {
    const m = await render(
      `<header mol-nav-top><span slot="right" data-right></span></header>`,
      AppShellTopNav,
    )
    expect(m.host.innerHTML).toContain('data-right=""')
  })

  it('forwards className onto the <header>', async () => {
    const m = await render(`<header mol-nav-top className="tn-cls"></header>`, AppShellTopNav)
    expect(m.host.innerHTML).toContain('tn-cls')
  })
})
