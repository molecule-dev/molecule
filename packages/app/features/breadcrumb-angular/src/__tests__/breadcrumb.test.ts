// @vitest-environment jsdom
/**
 * Unit tests of `Breadcrumb` — the port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb.test.tsx`. The
 * React suite renders the component with a mocked ClassMap and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
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

const { Breadcrumb } = await import('../breadcrumb.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
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
 * @param props - The props object the template reads as `p['name']`.
 * @param hostClass - An optional host class with its own bindings
 *   (`items()`), for tests that bind computed props.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  props: Record<string, unknown> = {},
  hostClass?: Type<unknown>,
): Promise<Mounted> {
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Breadcrumb],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    hostClass ??
      class DefaultHost {
        p: Record<string, unknown> = props
      },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  // Two ticks: view queries resolve during the first, and bindings that read
  // them (a computed `items()`) re-render with their value on the second.
  appRef.tick()
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The `<nav>` the Breadcrumb component rendered. */
const navOf = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('nav')
  if (!el) throw new Error('no <nav> rendered')
  return el
}

const mounted: Mounted[] = []

const render = async (
  template: string,
  props: Record<string, unknown> = {},
  hostClass?: Type<unknown>,
): Promise<HTMLElement> => {
  const m = await mount(template, props, hostClass)
  mounted.push(m)
  return m.host
}

const bindAll =
  '<nav mol-breadcrumb [items]="p[\'items\']" [onNavigate]="p[\'onNavigate\']" [className]="p[\'className\']" [dataMolId]="p[\'dataMolId\']">'
const closeNav = '</nav>'

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('Breadcrumb', () => {
  it('renders every crumb label', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items })
    expect(navOf(host).innerHTML).toContain('Home')
    expect(navOf(host).innerHTML).toContain('Projects')
    expect(navOf(host).innerHTML).toContain('Alpha')
  })

  it('marks the last crumb as the current page', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items })
    expect(navOf(host).innerHTML).toContain('aria-current="page"')
  })

  it('renders linked crumbs as anchors when no onNavigate is supplied', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items })
    expect(navOf(host).innerHTML).toContain('href="/"')
    expect(navOf(host).innerHTML).toContain('href="/projects"')
  })

  it('renders linked crumbs as buttons when onNavigate is supplied', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items, onNavigate: () => {} })
    expect(navOf(host).innerHTML).toContain('<button')
    expect(navOf(host).innerHTML).not.toContain('href="/projects"')
  })

  it('renders a crumb without `to` as plain text', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items: [{ label: 'Just text' }] })
    expect(navOf(host).innerHTML).toContain('Just text')
    expect(navOf(host).innerHTML).not.toContain('href')
    expect(navOf(host).innerHTML).not.toContain('<button')
  })

  it('renders the default "/" separator between crumbs', async () => {
    const host = await render(`${bindAll}${closeNav}`, { items })
    // two separators for three items
    expect(navOf(host).innerHTML.split('aria-hidden="true">/').length - 1).toBe(2)
  })

  it('renders a custom separator node', async () => {
    const host = await render(`${bindAll}<span slot="separator" data-sep="">></span>${closeNav}`, {
      items,
    })
    expect(navOf(host).innerHTML).toContain('data-sep=""')
  })

  it('renders crumb icons', async () => {
    const host = await render(
      `<ng-template #iconTpl><i data-icon=""></i></ng-template>
      <nav mol-breadcrumb [items]="[{ label: 'Home', to: '/', icon: iconTpl }]"></nav>`,
    )
    expect(navOf(host).innerHTML).toContain('data-icon=""')
  })

  it('labels the nav region "Breadcrumb", sets data-mol-id, and forwards className', async () => {
    const host = await render(`${bindAll}${closeNav}`, {
      items,
      dataMolId: 'bc-x',
      className: 'bc-cls',
    })
    const nav = navOf(host)
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb')
    expect(nav.getAttribute('data-mol-id')).toBe('bc-x')
    expect(nav.getAttribute('class')).toContain('bc-cls')
  })
})
