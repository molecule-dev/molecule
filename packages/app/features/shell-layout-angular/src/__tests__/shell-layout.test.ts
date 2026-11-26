// @vitest-environment jsdom
/**
 * Unit tests of `AppShellLayout` — the port of
 * `@molecule/app-shell-layout-react`'s own suite. The React suite renders the
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `page`),
// so tests can assert which cm.* class was applied without a real bond.
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

// Container renders its children inside a marked div carrying the max width —
// the same observable contract the React suite's Container mock has.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Container: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-container]',
      standalone: true,
      inputs: ['maxWidth', 'centered', 'paddingX', 'className', 'style', 'testId'],
      host: {
        'data-container': '',
        '[attr.data-max-width]': 'maxWidth ?? null',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockContainer {
        /** Maximum width preset. */
        maxWidth?: string
        /** Whether the column is centered. */
        centered?: boolean
        /** Horizontal padding. */
        paddingX?: unknown
        /** Extra classes. */
        className?: string
        /** Inline style object. */
        style?: Record<string, unknown>
        /** `data-testid`. */
        testId?: string
      },
    ),
  }
})

const { AppShellLayout } = await import('../app-shell-layout.component.js')

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

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('[mol-shell-layout]')
  if (!el) throw new Error('no AppShellLayout host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`.replace(' ="', '="')
}

/** The inner `<main>` element of the rendered shell. */
const mainEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('main')
  if (!el) throw new Error('no <main> rendered')
  return el
}

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, AppShellLayout as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AppShellLayout', () => {
  it('renders the children inside a Container', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']"><div data-content></div></div>`,
    )
    expect(m.host.innerHTML).toContain('data-container')
    expect(m.host.innerHTML).toContain('data-content')
  })

  it('renders the header and footer slots when present', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']"><header slot="header" data-header></header><footer slot="footer" data-footer></footer>x</div>`,
    )
    expect(m.host.innerHTML).toContain('data-header')
    expect(m.host.innerHTML).toContain('data-footer')
  })

  it('omits header/footer when not supplied', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
    )
    expect(m.host.querySelector('header')).toBeNull()
    expect(m.host.querySelector('footer')).toBeNull()
  })

  it('passes the default maxWidth to the Container and honours an override', async () => {
    const def = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
    )
    expect(def.host.innerHTML).toContain('data-max-width="xl"')
    const wide = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
      { maxWidth: '2xl' },
    )
    expect(wide.host.innerHTML).toContain('data-max-width="2xl"')
  })

  it('leaves <main> with no class attribute when mainClassName is omitted', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
    )
    const main = mainEl(m.host)
    expect(main.getAttribute('class') ?? '').toBe('')
    expect(openTag(m.host)).not.toContain('<main')
  })

  it('forwards mainClassName onto the inner <main> element', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
      { mainClassName: 'main-pad-y' },
    )
    expect(mainEl(m.host).getAttribute('class')).toBe('main-pad-y')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(
      `<div mol-shell-layout [maxWidth]="p['maxWidth']" [className]="p['className']" [mainClassName]="p['mainClassName']" [dataMolId]="p['dataMolId']">x</div>`,
      { dataMolId: 'shell-x', className: 'sl-cls' },
    )
    const tag = openTag(m.host)
    expect(tag).toContain('data-mol-id="shell-x"')
    expect(tag).toContain('sl-cls')
  })
})
