// @vitest-environment jsdom
/**
 * Unit tests of `CollapsibleSection` and `ShowMore` — the port of
 * `@molecule/app-collapsible-section-react`'s own suite. The React suite
 * renders the components with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { CollapsibleSection } = await import('../collapsible-section.component.js')
const { ShowMore } = await import('../show-more.component.js')

/** A mounted spec host: its markup and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly innerHTML: string
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
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
  // Two passes: the first measures what a projected list rendered and marks the
  // view dirty; the second renders the toggle that depends on the measurement.
  appRef.tick()
  await appRef.whenStable()
  appRef.tick()
  return {
    get innerHTML() {
      return host.innerHTML
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Mounts a `CollapsibleSection` with the given props and body content. */
const renderSection = async (
  props: Record<string, unknown> = {},
  content = '<p data-body></p>',
): Promise<Mounted> => {
  const m = await mount(
    `<section mol-collapsible-section [title]="p['title']" [badge]="p['badge']" [actions]="p['actions']" [expanded]="p['expanded']" [defaultExpanded]="p['defaultExpanded']" [level]="p['level']" [className]="p['className']">${content}</section>`,
    CollapsibleSection as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/** `initialCount` items, each marked with its index — the React tests' `<div data-item>`. */
const items = (count: number): string =>
  Array.from(
    { length: count },
    (_value, index) => `<div data-item="${index}">item-${index}</div>`,
  ).join('')

/** Mounts a `ShowMore` with the given props and projected items. */
const renderList = async (props: Record<string, unknown> = {}, count = 5): Promise<Mounted> => {
  const m = await mount(
    `<div mol-show-more [initialCount]="p['initialCount']" [className]="p['className']">${items(count)}</div>`,
    ShowMore as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('CollapsibleSection', () => {
  it('renders the title and starts collapsed', async () => {
    const m = await renderSection({ title: 'Key concepts' })
    expect(m.innerHTML).toContain('Key concepts')
    expect(m.innerHTML).toContain('aria-expanded="false"')
    expect(m.innerHTML).not.toContain('data-body=""')
  })

  it('renders the body when defaultExpanded is true', async () => {
    const m = await renderSection({ title: 'T', defaultExpanded: true })
    expect(m.innerHTML).toContain('aria-expanded="true"')
    expect(m.innerHTML).toContain('data-body=""')
  })

  it('respects the controlled expanded prop', async () => {
    const m = await renderSection({ title: 'T', expanded: true })
    expect(m.innerHTML).toContain('data-body=""')
  })

  it('renders the badge and actions slots', async () => {
    const m = await renderSection(
      { title: 'T' },
      '<span slot="badge" data-badge></span><span slot="actions" data-actions></span>',
    )
    expect(m.innerHTML).toContain('data-badge=""')
    expect(m.innerHTML).toContain('data-actions=""')
  })

  it('renders the heading at the requested level', async () => {
    const m = await renderSection({ title: 'T', level: 2 })
    expect(m.innerHTML).toContain('<h2')
  })

  it('forwards className', async () => {
    const m = await renderSection({ title: 'T', className: 'cs-cls' })
    expect(m.innerHTML).toContain('cs-cls')
  })
})

describe('ShowMore', () => {
  it('renders only the initialCount items by default', async () => {
    const m = await renderList({ initialCount: 3 })
    expect(m.innerHTML).toContain('item-0')
    expect(m.innerHTML).toContain('item-2')
    expect(m.innerHTML).not.toContain('item-3')
  })

  it('renders a "Show N more" toggle when there are extra items', async () => {
    const m = await renderList({ initialCount: 3 })
    expect(m.innerHTML).toContain('Show 2 more')
  })

  it('renders no toggle when all items fit within initialCount', async () => {
    const m = await renderList({ initialCount: 3 }, 2)
    expect(m.innerHTML).not.toContain('Show')
  })

  it('forwards className', async () => {
    const m = await renderList({ className: 'sm-cls' }, 2)
    expect(m.innerHTML).toContain('sm-cls')
  })
})
