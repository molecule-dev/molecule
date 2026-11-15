// @vitest-environment jsdom
/**
 * Unit tests of `AddressDisplay` — the port of
 * `@molecule/app-address-display-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
// `flex1`), so tests can assert which cm.* class was applied without a real
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

const { AddressDisplay } = await import('../address-display.component.js')

const address = {
  line1: '123 Main St',
  line2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'USA',
}

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

/** The bindings every host template carries. */
const BINDINGS =
  `[address]="p['address']" [name]="p['name']" [phone]="p['phone']"` +
  ` [inline]="p['inline']" [className]="p['className']"`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> => {
  const m = await mount(
    `<div mol-address-display ${BINDINGS}>${projected}</div>`,
    AddressDisplay as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AddressDisplay', () => {
  it('renders the formatted address lines', async () => {
    const m = await render({ address })
    expect(m.host.innerHTML).toContain('123 Main St')
    expect(m.host.innerHTML).toContain('Suite 4')
    expect(m.host.innerHTML).toContain('Springfield, IL 62704')
    expect(m.host.innerHTML).toContain('USA')
  })

  it('renders multi-line mode inside an <address> element by default', async () => {
    const m = await render({ address })
    expect(m.host.innerHTML).toContain('<address')
  })

  it('joins all fields on one line in inline mode', async () => {
    const m = await render({ address, inline: true })
    expect(m.host.innerHTML).toContain('123 Main St, Suite 4, Springfield, IL 62704, USA')
    expect(m.host.innerHTML).not.toContain('<address')
  })

  it('renders the name when present and omits it otherwise', async () => {
    const m = await render({ address, name: 'Acme HQ' })
    expect(m.host.innerHTML).toContain('Acme HQ')
  })

  it('renders the phone as a tel: link', async () => {
    const m = await render({ address, phone: '+15551234' })
    expect(m.host.innerHTML).toContain('href="tel:+15551234"')
    expect(m.host.innerHTML).toContain('+15551234')
  })

  it('renders the leading and actions slots', async () => {
    const m = await render(
      { address },
      `<span slot="leading" data-leading></span><span slot="actions" data-actions></span>`,
    )
    expect(m.host.innerHTML).toContain('data-leading=""')
    expect(m.host.innerHTML).toContain('data-actions=""')
  })

  it('forwards className', async () => {
    const m = await render({ address, className: 'ad-cls' })
    expect(m.host.innerHTML).toContain('ad-cls')
  })
})
