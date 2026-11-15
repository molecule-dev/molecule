// @vitest-environment jsdom
/**
 * Unit tests of `StatusSummary` — the port of
 * `@molecule/app-status-summary-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings. Inline colors are set
 * through the CSSOM, so jsdom serializes them as `rgb(...)` (the same values
 * React's runtime mount produces).
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { StatusSummary } = await import('../status-summary.component.js')

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

/** The host template: the component element plus any projected content. */
const template = (projected = ''): string =>
  `<div mol-status-summary [groups]="p['groups']" [overallStatus]="p['overallStatus']" [className]="p['className']">${projected}</div>`

const groups = [
  {
    id: 'api',
    name: 'API',
    components: [
      { id: 'rest', name: 'REST API', status: 'operational' },
      { id: 'gql', name: 'GraphQL', status: 'degraded' },
    ],
  },
]

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> => {
  const m = await mount(template(projected), StatusSummary as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('StatusSummary', () => {
  it('renders the group and component names', async () => {
    const m = await render({ groups })
    expect(m.host.innerHTML).toContain('API')
    expect(m.host.innerHTML).toContain('REST API')
    expect(m.host.innerHTML).toContain('GraphQL')
  })

  it('derives the overall banner from the worst child status', async () => {
    const m = await render({ groups })
    // worst of operational + degraded => degraded
    expect(m.host.innerHTML).toContain('Degraded performance')
    expect(m.host.innerHTML).toContain('rgb(234, 179, 8)')
  })

  it('honours an explicit overallStatus override', async () => {
    const m = await render({ groups, overallStatus: 'major-outage' })
    expect(m.host.innerHTML).toContain('Major outage')
    expect(m.host.innerHTML).toContain('rgb(239, 68, 68)')
  })

  it('renders a colored badge for each component status', async () => {
    const m = await render({ groups })
    expect(m.host.innerHTML).toContain('Operational')
    expect(m.host.innerHTML).toContain('Degraded performance')
  })

  it('renders the header and footer slots', async () => {
    const m = await render(
      { groups },
      '<span slot="header" data-header></span><div slot="footer" data-footer></div>',
    )
    expect(m.host.innerHTML).toContain('data-header')
    expect(m.host.innerHTML).toContain('data-footer')
  })

  it('forwards className', async () => {
    const m = await render({ groups, className: 'sts-cls' })
    expect(m.host.innerHTML).toContain('sts-cls')
  })
})
