// @vitest-environment jsdom
/**
 * Unit tests of `OrderTimeline` — the port of
 * `@molecule/app-order-timeline-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`bgTone-success`) a node picked. Bare members such as
        // `bgBorder` are plain class strings in the real UIClassMap, and the
        // component binds one straight into `[class]`, where Angular rejects
        // anything but a string — so they come back as their token string.
        if (prop === 'bgBorder') return token
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { OrderTimeline } = await import('../order-timeline.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const TEMPLATE =
  '<div mol-order-timeline [milestones]="p[\'milestones\']" [eta]="p[\'eta\']" [orientation]="p[\'orientation\']" [className]="p[\'className\']"></div>'

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @param hostId - A per-mount number, so each JIT host gets its own selector
 *   and Angular never reports a component-ID collision.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
  hostId = 0,
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${hostId}`,
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
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

/** The rendered timeline host element. */
const timelineEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('div[mol-order-timeline]')
  if (!el) throw new Error('no OrderTimeline rendered')
  return el
}

const mounted: Mounted[] = []
let hostCount = 0

const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(TEMPLATE, OrderTimeline as Type<unknown>, props, hostCount++)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const milestones = [
  { id: 'placed', label: 'Placed', detail: 'Mar 1', completed: true },
  { id: 'shipped', label: 'Shipped', detail: 'Mar 3', current: true },
  { id: 'delivered', label: 'Delivered' },
]

describe('OrderTimeline', () => {
  it('renders every milestone label', async () => {
    const m = await render({ milestones })
    const markup = timelineEl(m.host).innerHTML
    expect(markup).toContain('Placed')
    expect(markup).toContain('Shipped')
    expect(markup).toContain('Delivered')
  })

  it('renders milestone details when present', async () => {
    const m = await render({ milestones })
    const markup = timelineEl(m.host).innerHTML
    expect(markup).toContain('Mar 1')
    expect(markup).toContain('Mar 3')
  })

  it('colors completed, current, and pending nodes differently', async () => {
    const m = await render({ milestones })
    const markup = timelineEl(m.host).innerHTML
    expect(markup).toContain('bgTone-info') // current
    expect(markup).toContain('bgTone-success') // completed
    expect(markup).toContain('bgBorder') // pending: the theme's border colour
    expect(markup).not.toContain('background')
  })

  it('renders the ETA line when present', async () => {
    const m = await render({ milestones, eta: 'Arrives Mar 5' })
    expect(timelineEl(m.host).innerHTML).toContain('Arrives Mar 5')
  })

  it('renders without error in vertical orientation', async () => {
    const m = await render({ milestones, orientation: 'vertical' })
    expect(timelineEl(m.host).innerHTML).toContain('Placed')
  })

  it('forwards className', async () => {
    const m = await render({ milestones, className: 'ot-cls' })
    expect(timelineEl(m.host).outerHTML).toContain('ot-cls')
  })
})
