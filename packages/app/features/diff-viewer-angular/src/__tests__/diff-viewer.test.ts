// @vitest-environment jsdom
/**
 * Unit tests of `DiffViewer` — the port of
 * `@molecule/app-diff-viewer-react`'s own suite. The React suite renders the
 * component with a mocked ClassMap and asserts the markup; this port mounts
 * the same mocked tree through Angular's real renderer (the same
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { DiffViewer } = await import('../diff-viewer.component.js')

/** A mounted spec host: its DOM and a teardown. */
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
 * @param template - The host template (the component element with its inputs).
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template every case uses: every input bound from `p`. */
const TEMPLATE = `<div mol-diff-viewer [before]="p['before']" [after]="p['after']" [mode]="p['mode']" [showLineNumbers]="p['showLineNumbers']" [filename]="p['filename']" [className]="p['className']"></div>`

const mounted: Mounted[] = []

/** Mounts a {@link DiffViewer} and returns the markup it produced. */
const render = async (props: Record<string, unknown> = {}): Promise<string> => {
  const m = await mount(TEMPLATE, DiffViewer as Type<unknown>, props)
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

describe('DiffViewer', () => {
  it('renders all lines from before and after', async () => {
    const markup = await render({ before, after })
    expect(markup).toContain('line one')
    expect(markup).toContain('line two')
    expect(markup).toContain('line TWO')
    expect(markup).toContain('line three')
  })

  it('marks removed lines with "-" and added lines with "+"', async () => {
    const markup = await render({ before, after })
    expect(markup).toContain('-')
    expect(markup).toContain('+')
  })

  it('highlights add/remove rows with the appropriate background color', async () => {
    const markup = await render({ before, after })
    expect(markup).toContain('rgba(34, 197, 94, 0.15)')
    expect(markup).toContain('rgba(239, 68, 68, 0.15)')
  })

  it('renders the filename header when present and omits it otherwise', async () => {
    expect(await render({ before, after, filename: 'app.ts' })).toContain('app.ts')
    expect(await render({ before, after })).not.toContain('<header')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', async () => {
    const withNums = await render({ before, after })
    expect(withNums).toMatch(/width:\s*36px/)
    const without = await render({ before, after, showLineNumbers: false })
    expect(without).not.toMatch(/width:\s*36px/)
  })

  it('uses a two-column grid layout in split mode', async () => {
    const markup = await render({ before, after, mode: 'split' })
    expect(markup).toContain('grid')
  })

  it('forwards className', async () => {
    const markup = await render({ before, after, className: 'dv-cls' })
    expect(markup).toContain('dv-cls')
  })
})
