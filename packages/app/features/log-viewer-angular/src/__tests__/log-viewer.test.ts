// @vitest-environment jsdom
/**
 * Unit tests of `LogViewer` — the port of
 * `@molecule/app-log-viewer-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
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

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        // Expose the tone a tone helper was called with, so the severity
        // mapping is assertable (the proxy otherwise echoes only the name).
        if (prop === 'bgTone') return (tone: unknown) => `${token}-${String(tone)}`
        // React consumes `flex1` as a value, not a call; the proxy would
        // otherwise hand Angular a function where a class string must be.
        if (prop === 'flex1') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { LogViewer } = await import('../log-viewer.component.js')
import type { LogEntry } from '../types.js'

/** Spec hosts mounted so far: each gets its own id (Angular component-id collision). */
let hostCount = 0

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
    // Angular derives a component id from the definition; two mounts with the
    // same template collide (NG0912), so each gets its own host attribute.
    host: { 'data-spec-host': String(++hostCount) },
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, LogViewer as Type<unknown>, props)
  mounted.push(m)
  return m
}

/** The standard host template: entries + className. */
const BINDINGS = `[entries]="p['entries']" [className]="p['className']"`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const entries: LogEntry[] = [
  { id: '1', timestamp: '10:00', level: 'info', message: 'started up', service: 'auth-api' },
  {
    id: '2',
    timestamp: '10:01',
    level: 'error',
    message: 'boom',
    traceId: 'trace-xyz',
    data: { code: 500 },
  },
]

describe('LogViewer', () => {
  it('renders the emptyState when there are no entries', async () => {
    const m = await render(
      `<mol-log-viewer [entries]="p['entries']"><ng-container ngProjectAs="[slot=emptyState]"><p data-empty>No logs</p></ng-container></mol-log-viewer>`,
      { entries: [] },
    )
    expect(m.host.innerHTML).toContain('data-empty')
    expect(m.host.innerHTML).toContain('No logs')
  })

  it('exposes a log role and a <details> per entry', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, { entries })
    expect(m.host.innerHTML).toContain('role="log"')
    expect(m.host.querySelectorAll('details')).toHaveLength(2)
  })

  it('renders the timestamp, level, and message in each summary', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, { entries })
    expect(m.host.innerHTML).toContain('10:00')
    expect(m.host.innerHTML).toContain('info')
    expect(m.host.innerHTML).toContain('started up')
    expect(m.host.innerHTML).toContain('boom')
  })

  it('colors the level badge by severity', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, { entries })
    expect(m.host.innerHTML).toContain('bgTone-success') // info
    expect(m.host.innerHTML).toContain('bgTone-error') // error
    expect(m.host.innerHTML).toContain('textOnTone')
  })

  it('renders the service label and trace id when present', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, { entries })
    expect(m.host.innerHTML).toContain('auth-api')
    expect(m.host.innerHTML).toContain('trace-xyz')
  })

  it('renders the structured data panel when an entry has data', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, { entries })
    expect(m.host.innerHTML).toContain('<pre')
    expect(m.host.innerHTML).toContain('500')
  })

  it('forwards className onto the list wrapper', async () => {
    const m = await render(`<mol-log-viewer ${BINDINGS}></mol-log-viewer>`, {
      entries,
      className: 'lv-cls',
    })
    expect(m.host.innerHTML).toContain('lv-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of emptyState', async () => {
    const m = await render(
      `<mol-log-viewer [entries]="p['entries']"><ng-container ngProjectAs="[slot=emptyState]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></mol-log-viewer>`,
      { entries: [], xs: ['a', 'c'] },
    )
    const labels = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(labels()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the empty-state wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<mol-log-viewer [entries]="p['entries']">@if (p['on']) {<p slot="emptyState" data-empty>No logs</p>}</mol-log-viewer>`,
      { entries: [], on: false },
    )
    // React: the bare empty state replaces the list wrapper while it renders.
    expect(m.host.querySelector('[data-empty]')).toBeNull()
    expect(m.host.querySelector('[role="log"]')).not.toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[data-empty]')!.textContent).toBe('No logs')
    expect(m.host.querySelector('[role="log"]')).toBeNull()
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-empty]')).toBeNull()
    expect(m.host.querySelector('[role="log"]')).not.toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await render(
      `<i>a</i><mol-log-viewer [entries]="p['entries']"><p slot="emptyState" data-empty>No logs</p></mol-log-viewer><i>b</i>`,
      { entries },
    )
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // With entries, React's root is <div role="log"> standing in the (removed) host's place.
    expect(children()).toEqual(['i', 'div', 'i'])
    // With no entries and a projected empty state, the bare <p> is React's root.
    await m.setProps({ entries: [] })
    expect(children()).toEqual(['i', 'p', 'i'])
    await m.setProps({ entries })
    expect(children()).toEqual(['i', 'div', 'i'])
  })
})
