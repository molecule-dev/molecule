// @vitest-environment jsdom
/**
 * Unit tests of `SectionDivider` — the port of
 * `@molecule/app-section-divider-react`'s own suite. The React suite renders
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

const { SectionDivider } = await import('../section-divider.component.js')

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

/** The divider element of the rendered tree. */
const dividerEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[mol-section-divider]')
  if (!el) throw new Error('no SectionDivider host rendered')
  return el
}

/** The template the tests mount: every prop binding an app would write. */
const TEMPLATE = `<div mol-section-divider [align]="p['align']" [className]="p['className']">{{ p['label'] }}</div>`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(TEMPLATE, SectionDivider as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SectionDivider', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of label', async () => {
    const m = await mount(
      `<div mol-section-divider>@for (x of p['xs']; track x) {<b>{{ x }}</b>}</div>`,
      SectionDivider as Type<unknown>,
      { xs: [1, 3] },
    )
    mounted.push(m)
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('exposes a horizontal separator role', async () => {
    const m = await render()
    expect(m.host.innerHTML).toContain('role="separator"')
    expect(m.host.innerHTML).toContain('aria-orientation="horizontal"')
  })

  it('renders the label children when present', async () => {
    const m = await render({ label: 'OR' })
    expect(m.host.innerHTML).toContain('OR')
  })

  // jsdom canonicalizes every style written through the CSSOM (Angular's
  // `[style.…]` bindings) to `border-top: 1px solid` — React's own suite
  // counts occurrences of the same declaration in React's serialized form.
  it('renders flanking lines on both sides for center alignment', async () => {
    const m = await render({ align: 'center', label: 'OR' })
    expect(m.host.innerHTML.split('border-top: 1px solid').length - 1).toBe(2)
  })

  it('renders a single flanking line for start alignment', async () => {
    const m = await render({ align: 'start', label: 'Today' })
    expect(m.host.innerHTML.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('renders a single flanking line for end alignment', async () => {
    const m = await render({ align: 'end', label: 'Today' })
    expect(m.host.innerHTML.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('forwards className', async () => {
    const m = await render({ className: 'sd-cls' })
    expect(dividerEl(m.host).getAttribute('class')).toBe('flex sd-cls')
  })

  /** The component's markup without Angular's comments, classes and styles. */
  const shape = (m: Mounted): string =>
    m.host.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replace(/ class="[^"]*"/g, '')
      .replace(/ style="[^"]*"/g, '')

  it('shows and removes the label wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-section-divider>@if (p['on']) {<span>OR</span>}</div>`,
      SectionDivider as Type<unknown>,
      { on: false },
    )
    mounted.push(m)
    expect(shape(m)).toBe(
      '<div role="separator" aria-orientation="horizontal" mol-section-divider=""><span aria-hidden="true"></span><span aria-hidden="true"></span></div>',
    )
    await m.setProps({ on: true })
    expect(shape(m)).toBe(
      '<div role="separator" aria-orientation="horizontal" mol-section-divider=""><span aria-hidden="true"></span><span><span>OR</span></span><span aria-hidden="true"></span></div>',
    )
    await m.setProps({ on: false })
    expect(shape(m)).toBe(
      '<div role="separator" aria-orientation="horizontal" mol-section-divider=""><span aria-hidden="true"></span><span aria-hidden="true"></span></div>',
    )
  })
})
