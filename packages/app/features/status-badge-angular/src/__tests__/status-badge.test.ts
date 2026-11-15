// @vitest-environment jsdom
/**
 * Unit tests of `StatusBadge` / `StatusPill` — ports of
 * `@molecule/app-status-badge-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; these ports
 * mount the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and assert the same markup contract.
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

// A ClassMap proxy: `cn(...)` joins tokens (calling function-valued args
// first) and `badge({ variant })` maps to a real `bg-<color>` utility — the
// same mock the React suite installs.
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
        if (prop === 'badge') {
          return (opts?: { variant?: string }) => `badge bg-${opts?.variant ?? 'default'}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { StatusBadge } = await import('../status-badge.component.js')
const { StatusPill } = await import('../status-pill.component.js')

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

/**
 * The component's own host element.
 *
 * @param host - The spec host.
 * @param marker - The component selector's marker attribute.
 * @returns The component host element.
 */
const rootEl = (host: HTMLElement, marker: string): HTMLElement => {
  const el = host.querySelector(`[${marker}]`)
  if (!el) throw new Error(`no ${marker} element rendered`)
  return el as HTMLElement
}

const badgeTemplate = (content: string): string =>
  `<span mol-status-badge [kind]="p['kind']" [appearance]="p['appearance']" [className]="p['className']">${content}</span>`

const pillTemplate = `<span mol-status-pill [kind]="p['kind']" [dot]="p['dot']" [className]="p['className']">Pending</span>`

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts a StatusBadge with the given props.
 *
 * @param props - Badge props.
 * @param content - Projected children (default `Open`).
 * @returns The mounted host.
 */
const renderBadge = async (
  props: Record<string, unknown> = {},
  content = 'Open',
): Promise<Mounted> => {
  const m = await mount(badgeTemplate(content), StatusBadge as Type<unknown>, props)
  mounted.push(m)
  return m
}

/**
 * Mounts a StatusPill with the given props.
 *
 * @param props - Pill props.
 * @returns The mounted host.
 */
const renderPill = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(pillTemplate, StatusPill as Type<unknown>, props)
  mounted.push(m)
  return m
}

describe('StatusBadge', () => {
  it('renders the ui-appearance Badge by default with the kind-mapped color', async () => {
    const m = await renderBadge({ kind: 'success' })
    const root = rootEl(m.host, 'mol-status-badge')
    expect(root.getAttribute('class')).toContain('bg-success')
    expect(root.textContent).toContain('Open')
  })

  it('maps the neutral kind to the secondary Badge color', async () => {
    const m = await renderBadge({ kind: 'neutral' }, 'Archived')
    expect(rootEl(m.host, 'mol-status-badge').getAttribute('class')).toContain('bg-secondary')
  })

  it('renders a plain <span> pill (no Badge) for the uppercase-pill appearance', async () => {
    const m = await renderBadge({ kind: 'error', appearance: 'uppercase-pill' }, 'Failed')
    const root = rootEl(m.host, 'mol-status-badge')
    expect(root.tagName).toBe('SPAN')
    expect(root.getAttribute('class')).toContain('uppercase')
    expect(root.textContent).toContain('Failed')
  })

  it.each([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-error'],
    ['info', 'bg-info'],
    ['neutral', 'bg-secondary'],
  ] as const)('colors the %s uppercase-pill with a real theme token', async (kind, colorToken) => {
    const m = await renderBadge({ kind, appearance: 'uppercase-pill' }, 'X')
    const classes = rootEl(m.host, 'mol-status-badge').getAttribute('class') ?? ''
    expect(classes).toContain(colorToken)
    expect(classes).not.toContain('-container')
  })

  it('renders the leading icon', async () => {
    const m = await renderBadge({}, '<i slot="icon" data-icon></i>X')
    const root = rootEl(m.host, 'mol-status-badge')
    expect(root.querySelector('[data-icon]')).not.toBeNull()
    // React renders the span wrapper around the icon.
    expect(root.firstElementChild?.tagName).toBe('SPAN')
    expect(root.firstElementChild?.contains(root.querySelector('[data-icon]'))).toBe(true)
  })

  it('omits the icon wrapper when no icon is projected', async () => {
    const m = await renderBadge()
    expect(rootEl(m.host, 'mol-status-badge').firstElementChild).toBeNull()
  })

  it('forwards className in both appearances', async () => {
    const ui = await renderBadge({ className: 'sb-cls' })
    expect(rootEl(ui.host, 'mol-status-badge').getAttribute('class')).toContain('sb-cls')
    const pill = await renderBadge({ appearance: 'uppercase-pill', className: 'sb-cls' })
    expect(rootEl(pill.host, 'mol-status-badge').getAttribute('class')).toContain('sb-cls')
  })

  it('re-renders when the appearance changes', async () => {
    const m = await renderBadge({ kind: 'info' })
    expect(rootEl(m.host, 'mol-status-badge').getAttribute('class')).not.toContain('uppercase')
    await m.setProps({ appearance: 'uppercase-pill' })
    expect(rootEl(m.host, 'mol-status-badge').getAttribute('class')).toContain('uppercase')
  })
})

describe('StatusPill', () => {
  it('renders its children', async () => {
    const m = await renderPill()
    expect(m.host.textContent).toContain('Pending')
  })

  it('renders the leading dot by default and omits it when dot={false}', async () => {
    const withDot = await renderPill({ kind: 'success' })
    expect(withDot.host.querySelector('[aria-hidden]')).not.toBeNull()
    const without = await renderPill({ dot: false })
    expect(without.host.querySelector('[aria-hidden]')).toBeNull()
  })

  it('forwards className', async () => {
    const m = await renderPill({ className: 'sp-cls' })
    expect(rootEl(m.host, 'mol-status-pill').getAttribute('class')).toContain('sp-cls')
  })
})
