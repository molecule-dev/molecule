// @vitest-environment jsdom
/**
 * Unit tests of `FloatingActionButton` — the port of
 * `@molecule/app-floating-action-button-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { FloatingActionButton } = await import('../floating-action-button.component.js')

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

/** The host template for a {@link FloatingActionButton} without projected icon content. */
const bare = `<div mol-floating-action-button [label]="p['label']" [onClick]="p['onClick']" [href]="p['href']" [position]="p['position']" [size]="p['size']" [showTooltip]="p['showTooltip']" [className]="p['className']"></div>`

/** The host template with a `[slot=icon]` projection. */
const withIcon = `<div mol-floating-action-button [label]="p['label']" [onClick]="p['onClick']" [href]="p['href']" [position]="p['position']" [size]="p['size']" [showTooltip]="p['showTooltip']" [className]="p['className']"><span slot="icon" data-icon></span></div>`

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, FloatingActionButton as Type<unknown>, props)
  mounted.push(m)
  return m
}

/** The rendered root element of the button/anchor. */
const root = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('button, a')
  if (!(el instanceof HTMLElement)) throw new Error('no FloatingActionButton root rendered')
  return el
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('FloatingActionButton', () => {
  it('renders a <button> when onClick is supplied', async () => {
    const m = await render(withIcon, { label: 'Add', onClick: () => {} })
    expect(root(m.host).tagName).toBe('BUTTON')
    expect(m.host.innerHTML).toContain('data-icon')
  })

  it('renders an <a> when href is supplied', async () => {
    const m = await render(bare, { label: 'Add', href: '/new' })
    expect(root(m.host).tagName).toBe('A')
    expect(root(m.host).getAttribute('href')).toBe('/new')
  })

  it('uses the label as the aria-label', async () => {
    const m = await render(bare, { label: 'New item', onClick: () => {} })
    expect(root(m.host).getAttribute('aria-label')).toBe('New item')
  })

  it('renders the tooltip title by default and drops it when showTooltip is false', async () => {
    expect(
      root((await render(bare, { label: 'Add', onClick: () => {} })).host).getAttribute('title'),
    ).toBe('Add')
    const without = await render(bare, { label: 'Add', onClick: () => {}, showTooltip: false })
    expect(root(without.host).hasAttribute('title')).toBe(false)
  })

  it('anchors to the requested screen corner via inline style', async () => {
    const m = await render(bare, { label: 'Add', onClick: () => {}, position: 'top-left' })
    expect(root(m.host).getAttribute('style')).toMatch(/position:\s*fixed/)
    expect(root(m.host).getAttribute('style')).toMatch(/left:\s*24px/)
    expect(root(m.host).getAttribute('style')).toMatch(/top:\s*24px/)
  })

  it('sizes the button from the size preset', async () => {
    const m = await render(bare, { label: 'Add', onClick: () => {}, size: 'lg' })
    // lg → 16 * 4 = 64px
    expect(root(m.host).getAttribute('style')).toMatch(/width:\s*64px/)
  })

  it('forwards className', async () => {
    const m = await render(bare, { label: 'Add', onClick: () => {}, className: 'fab-cls' })
    expect(root(m.host).getAttribute('class')).toContain('fab-cls')
  })

  it('applies a visible default surface (background + elevation) out of the box', async () => {
    const cls = root((await render(bare, { label: 'Add', onClick: () => {} })).host).className
    // A FAB is a prominent primary action — its default surface must not be
    // empty (the pre-fix bug: a transparent, invisible circle).
    expect(cls.length).toBeGreaterThan(0)
    expect(cls).toContain('gradientPrimary')
    expect(cls).toContain('shadowLifted')
  })

  it('lets an explicit className override/compose over the default surface', async () => {
    const m = await render(bare, { label: 'Add', onClick: () => {}, className: 'fab-override' })
    const cls = root(m.host).className
    // Caller class composes in…
    expect(cls).toContain('fab-override')
    // …and is emitted AFTER the default surface token, so under cm.cn's real
    // tailwind-merge a conflicting caller class wins (default is overridable).
    expect(cls.indexOf('fab-override')).toBeGreaterThan(cls.indexOf('gradientPrimary'))
  })
})
