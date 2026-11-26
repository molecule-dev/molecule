// @vitest-environment jsdom
/**
 * Unit tests of `TabFilter` — the port of
 * `@molecule/app-tab-filter-react/src/__tests__/tab-filter.test.tsx`. The React
 * suite renders the component with a mocked ClassMap and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use. (Members are explicit because a
// Proxy's function-for-every-token shape breaks Angular's classMap binding,
// which rejects function values.)
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    flex: () => 'flex',
    tabsTrigger: (args: Record<string, unknown>) => `tabsTrigger-${args.variant}`,
    fontWeight: (weight: string) => `fontWeight-${weight}`,
    touchTargetCompact: 'touchTargetCompact',
    textSize: (size: string) => `textSize-${size}`,
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
  }),
}))

const { TabFilter } = await import('../tab-filter.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Distinguishes each fresh spec host so Angular never collides on ids. */
let specHostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  specHostCount += 1
  const specHost = specHostCount
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TabFilter],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(specHost) },
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts the filter with the given props and returns its host element.
 *
 * @param props - The component props.
 * @returns The mounted host element.
 */
const render = async (props: Record<string, unknown>): Promise<HTMLElement> => {
  const m = await mount(
    `<div mol-tab-filter [tabs]="p['tabs']" [activeId]="p['activeId']" [onChange]="p['onChange']" [className]="p['className']" [defaultTab]="p['defaultTab']"></div>`,
    props,
  )
  mounted.push(m)
  return m.host
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const tabs = [
  { id: 'all', label: 'All', count: 42 },
  { id: 'open', label: 'Open', count: 8 },
  { id: 'closed', label: 'Closed', disabled: true },
]

describe('TabFilter', () => {
  it('renders a tablist with one tab per entry', async () => {
    const host = await render({ tabs, activeId: 'all', onChange: () => {} })
    const markup = host.innerHTML
    expect(markup).toContain('role="tablist"')
    expect(markup.match(/role="tab"/g) ?? []).toHaveLength(3)
    expect(markup).toContain('All')
    expect(markup).toContain('Open')
    expect(markup).toContain('Closed')
  })

  it('marks the active tab with aria-selected="true"', async () => {
    const host = await render({ tabs, activeId: 'open', onChange: () => {} })
    expect(host.innerHTML.match(/aria-selected="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the count badge when a tab has a count', async () => {
    const host = await render({ tabs, activeId: 'all', onChange: () => {} })
    expect(host.textContent).toContain('(42)')
    expect(host.textContent).toContain('(8)')
  })

  it('disables a tab flagged disabled', async () => {
    const host = await render({ tabs, activeId: 'all', onChange: () => {} })
    expect(host.querySelector('button[disabled]')).not.toBeNull()
  })

  it('renders the tab icon', async () => {
    const m = await mount(
      `<ng-template #iconTpl><i data-icon=""></i></ng-template>
      <div mol-tab-filter [tabs]="[{ id: 'a', label: 'A', icon: iconTpl }]" [activeId]="'a'" [onChange]="p['onChange']"></div>`,
      { onChange: () => {} },
    )
    mounted.push(m)
    expect(m.host.innerHTML).toContain('data-icon=""')
  })

  it('forwards className', async () => {
    const host = await render({ tabs, activeId: 'all', onChange: () => {}, className: 'tf-cls' })
    expect(host.innerHTML).toContain('tf-cls')
  })
})

it.each(['notes', 'drafts'])(
  'keeps the collection default reachable from selected %s tabs',
  async (activeId) => {
    const onChange = vi.fn()
    const props = {
      tabs: [{ id: activeId, label: activeId }],
      defaultTab: { id: 'all', label: 'All documents' },
      activeId,
      onChange,
    }
    const host = await render(props)
    expect(host.innerHTML).toContain('All documents')
    expect(host.innerHTML.match(/role="tab"/g)).toHaveLength(2)
    host.querySelectorAll('button')[0]!.click()
    expect(onChange).toHaveBeenCalledWith('all')
  },
)

it('keeps one default tab when the supplied tabs already contain it', async () => {
  const host = await render({
    tabs,
    defaultTab: { id: 'all', label: 'All documents' },
    activeId: 'all',
    onChange: () => {},
  })
  expect(host.innerHTML.match(/data-mol-id="tab-filter-all"/g)).toHaveLength(1)
  expect(host.innerHTML).toContain('All documents')
})
