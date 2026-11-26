// @vitest-environment jsdom
/**
 * Unit tests of `StatusTimeline` — the port of
 * `@molecule/app-status-timeline-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this
 * port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) and asserts the same markup strings.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `statusTimelineList`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { StatusTimeline } = await import('../status-timeline.component.js')

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
  '<ol mol-status-timeline [steps]="p[\'steps\']" [currentKey]="p[\'currentKey\']" [ariaLabel]="p[\'ariaLabel\']" [className]="p[\'className\']" [dataMolId]="p[\'dataMolId\']"></ol>'

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element).
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

/** The rendered `<ol>` host element. */
const listEl = (host: HTMLElement): HTMLElement => {
  // The host mounts the component's own `<ol mol-status-timeline>` element.
  const el = host.querySelector<HTMLElement>('ol[mol-status-timeline]')
  if (!el) throw new Error('no StatusTimeline rendered')
  return el
}

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(TEMPLATE, StatusTimeline as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const steps = [
  { key: 'created', label: 'Created' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
]

describe('StatusTimeline', () => {
  it('renders an <ol> with one <li> per step', async () => {
    const m = await render({ steps, currentKey: 'review' })
    const markup = listEl(m.host).outerHTML
    expect(markup.startsWith('<ol')).toBe(true)
    expect(m.host.querySelectorAll('li')).toHaveLength(3)
    expect(markup).toContain('Created')
    expect(markup).toContain('In review')
    expect(markup).toContain('Done')
  })

  it('marks steps at or before the current one as reached (filled dot)', async () => {
    const m = await render({ steps, currentKey: 'review' })
    const markup = listEl(m.host).outerHTML
    // created + review reached => 2 primary dots, done => 1 idle dot
    expect(markup.split('bgPrimary').length - 1).toBe(2)
    expect(markup.split('statusTimelineDotIdle').length - 1).toBe(1)
  })

  it('bolds the current step label', async () => {
    const m = await render({ steps, currentKey: 'review' })
    const markup = listEl(m.host).outerHTML
    expect(markup.split('fontWeight').length - 1).toBe(1)
  })

  it('sets the aria-label and data-mol-id', async () => {
    const m = await render({
      steps,
      currentKey: 'created',
      ariaLabel: 'Order progress',
      dataMolId: 'st-x',
    })
    const markup = listEl(m.host).outerHTML
    expect(markup).toContain('aria-label="Order progress"')
    expect(markup).toContain('data-mol-id="st-x"')
  })

  it('forwards className', async () => {
    const m = await render({ steps, currentKey: 'done', className: 'stl-cls' })
    const markup = listEl(m.host).outerHTML
    expect(markup).toContain('stl-cls')
  })
})
