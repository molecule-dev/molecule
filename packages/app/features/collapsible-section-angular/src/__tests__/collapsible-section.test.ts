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

import { provideDomPlacement } from '@molecule/app-angular'

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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
  readonly host: HTMLElement
  /** The host's inner markup. */
  readonly innerHTML: string
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
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
  // Two passes: the first measures what a projected list rendered and marks the
  // view dirty; the second renders the toggle that depends on the measurement.
  appRef.tick()
  await appRef.whenStable()
  appRef.tick()
  return {
    host,
    get innerHTML() {
      return host.innerHTML
    },
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      await appRef.whenStable()
      appRef.tick()
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

  it('keeps a consumer list in order when an item is inserted in the middle of the collapsible body', async () => {
    const m = await mount(
      `<section mol-collapsible-section [title]="'T'" [defaultExpanded]="true">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</section>`,
      CollapsibleSection as Type<unknown>,
      { xs: ['a', 'c'] },
    )
    mounted.push(m)
    const body = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(body()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(body()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(body()).toEqual(['a', 'c'])
  })

  it('shows and removes the actions wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<section mol-collapsible-section [title]="'T'">@if (p['on']) {<span slot="actions" data-actions></span>}</section>`,
      CollapsibleSection as Type<unknown>,
      { on: false },
    )
    mounted.push(m)
    const actions = (): HTMLElement | null => m.host.querySelector('[data-actions]')
    // No projected actions: React renders no actions `<span>` at all.
    expect(actions()).toBeNull()
    await m.setProps({ on: true })
    expect(actions()).not.toBeNull()
    expect(actions()?.parentElement?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(actions()).toBeNull()
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

  it('keeps a consumer list in order when an item is inserted in the middle of the show-more list', async () => {
    const m = await mount(
      `<div mol-show-more [initialCount]="1">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</div>`,
      ShowMore as Type<unknown>,
      { xs: ['a', 'c'] },
    )
    mounted.push(m)
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    const label = (): string | undefined => m.host.querySelector('button')?.textContent?.trim()
    expect(shown()).toEqual(['a'])
    expect(label()).toBe('Show 1 more')
    // React's children.slice(0, 1): the inserted item is counted, and only the first one shows.
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a'])
    expect(label()).toBe('Show 2 more')
    await m.setProps({ xs: ['b', 'c'] })
    expect(shown()).toEqual(['b'])
    expect(label()).toBe('Show 1 more')
  })

  it('counts and orders the items a consumer adds, removes and reorders after the first render', async () => {
    const m = await mount(
      `<div mol-show-more [initialCount]="2">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</div>`,
      ShowMore as Type<unknown>,
      { xs: ['a', 'c'] },
    )
    mounted.push(m)
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    const button = (): HTMLButtonElement | null => m.host.querySelector('button')
    expect(shown()).toEqual(['a', 'c'])
    expect(button()).toBeNull()
    await m.setProps({ xs: ['a', 'b', 'c', 'd'] })
    expect(shown()).toEqual(['a', 'b'])
    expect(button()?.textContent?.trim()).toBe('Show 2 more')
    await m.setProps({ xs: ['d', 'c', 'b', 'a'] })
    expect(shown()).toEqual(['d', 'c'])
    button()!.click()
    await m.setProps({})
    expect(shown()).toEqual(['d', 'c', 'b', 'a'])
    expect(button()?.textContent?.trim()).toBe('Show less')
    await m.setProps({ xs: ['c'] })
    expect(shown()).toEqual(['c'])
    expect(button()).toBeNull()
  })

  it('shows and removes the item wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-show-more [initialCount]="3">@if (p['on']) {<b data-item>one</b>}</div>`,
      ShowMore as Type<unknown>,
      { on: false },
    )
    mounted.push(m)
    const item = (): HTMLElement | null => m.host.querySelector('[data-item]')
    expect(item()).toBeNull()
    await m.setProps({ on: true })
    // Within the initial count: the item renders in the same pass.
    expect(item()).not.toBeNull()
    expect(item()?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(item()).toBeNull()
  })
})
