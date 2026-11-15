// @vitest-environment jsdom
/**
 * Unit tests of `DefinitionList` and `InfoCard` — the port of
 * `@molecule/app-info-display-react`'s own suite. The React suite renders the
 * components and asserts the markup; this port mounts the same tree through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup strings.
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
// bond — the same mock the React package's own tests use.
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

const { DefinitionList } = await import('../definition-list.component.js')
const { InfoCard } = await import('../info-card.component.js')

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

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, InfoCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

const renderList = async (
  template: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, DefinitionList as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const fields = [
  { label: 'Name', value: 'Acme Inc.' },
  { label: 'Founded', value: '2020' },
]

/** The host element of a component, by its attribute selector. */
const hostOf = (host: HTMLElement, attr: string): HTMLElement => {
  const el = host.querySelector(`[${attr}]`)
  if (!el) throw new Error(`no [${attr}] element rendered`)
  return el as HTMLElement
}

const cardTemplate = `<div mol-info-card [fields]="p['fields']" [columns]="p['columns']" [className]="p['className']" [dataMolId]="p['dataMolId']"></div>`

const listTemplate = `<dl mol-definition-list [fields]="p['fields']" [columns]="p['columns']" [className]="p['className']"></dl>`

describe('DefinitionList', () => {
  it('renders every field label and value', async () => {
    const m = await renderList(listTemplate, { fields })
    expect(m.host.innerHTML).toContain('Name')
    expect(m.host.innerHTML).toContain('Acme Inc.')
    expect(m.host.innerHTML).toContain('Founded')
    expect(m.host.innerHTML).toContain('2020')
  })

  it('renders the field icon', async () => {
    const m = await renderList(
      `<dl mol-definition-list [fields]="[{ label: 'L', value: 'V', icon: iconTpl }]"><ng-template #iconTpl><i data-icon></i></ng-template></dl>`,
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
  })

  it('uses a stacked layout at columns=1 and a grid layout at columns>1', async () => {
    const one = await renderList(listTemplate, { fields, columns: 1 })
    expect(hostOf(one.host, 'mol-definition-list').getAttribute('class')).toContain('stack')
    const two = await renderList(listTemplate, { fields, columns: 2 })
    expect(hostOf(two.host, 'mol-definition-list').getAttribute('class')).toContain('grid')
  })

  it('renders a <dl> with <dt>/<dd> pairs', async () => {
    const m = await renderList(listTemplate, { fields })
    const list = hostOf(m.host, 'mol-definition-list')
    expect(list.tagName.toLowerCase()).toBe('dl')
    expect(m.host.innerHTML).toContain('<dt')
    expect(m.host.innerHTML).toContain('<dd')
  })

  it('forwards className', async () => {
    const m = await renderList(listTemplate, { fields, className: 'dl-cls' })
    expect(m.host.innerHTML).toContain('dl-cls')
  })
})

describe('InfoCard', () => {
  it('renders the title inside an <h3>', async () => {
    const m = await render(
      `<div mol-info-card [fields]="p['fields']"><span slot="title">Company</span></div>`,
      { fields },
    )
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Company')
  })

  it('renders the icon and actions slots', async () => {
    const m = await render(
      `<div mol-info-card [fields]="p['fields']"><span slot="title">T</span><i slot="icon" data-icon></i><button slot="actions" data-actions></button></div>`,
      { fields },
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
    expect(m.host.innerHTML).toContain('data-actions=""')
  })

  it('renders the DefinitionList fields', async () => {
    const m = await render(cardTemplate, { fields })
    expect(m.host.innerHTML).toContain('Acme Inc.')
    expect(m.host.innerHTML).toContain('2020')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render(cardTemplate, {
      fields,
      dataMolId: 'info-x',
      className: 'ic-cls',
    })
    const card = hostOf(m.host, 'mol-info-card')
    expect(card.getAttribute('data-mol-id')).toBe('info-x')
    expect(card.getAttribute('class')).toContain('ic-cls')
  })
})
