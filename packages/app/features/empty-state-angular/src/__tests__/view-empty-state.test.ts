// @vitest-environment jsdom
/**
 * Unit tests of the Angular `EmptyState`'s selected-view mode — the port of
 * `@molecule/app-empty-state-react`'s `view-empty-state.test.tsx`. The React
 * suite passes a `<a>`/`<button>` element as the view's action; Angular passes
 * the same markup as an `<ng-template>` the component renders.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

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

const { EmptyState } = await import('../empty-state.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Mounted spec hosts so far: Angular derives a component id from the definition. */
let hostCount = 0

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param template - The host template.
 * @returns The mounted host.
 */
async function mount(template: string): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [EmptyState],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template,
  })(class SpecHost {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<object> = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await appRef.whenStable()
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

const render = async (template: string): Promise<Mounted> => {
  const m = await mount(template)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('view-owned empty states', () => {
  it('keeps a selected list message and its recovery action together', async () => {
    const m = await render(
      `<ng-template #assignedAction><a href="/orders">Browse all orders</a></ng-template>
       <ng-template #allAction><a href="/orders/new">Create an order</a></ng-template>
       <section mol-empty-state [view]="{ title: 'Your assigned orders are empty', description: 'Choose an order from the full list to assign it.', action: assignedAction }"></section>`,
    )
    const markup = m.host.innerHTML
    expect(markup).toContain('Your assigned orders are empty')
    expect(markup).toContain('Choose an order from the full list to assign it.')
    expect(markup).toContain('<a href="/orders">Browse all orders</a>')
    expect(markup).not.toContain('No orders yet')
  })

  it('keeps the existing generic empty state valid without a recovery action', async () => {
    const m = await render(`<section mol-empty-state [title]="'No records yet'"></section>`)
    const markup = m.host.innerHTML
    expect(markup).toContain('No records yet')
    expect(markup).not.toContain('<a')
  })

  it('renders an app-owned button action without assuming a router or a URL', async () => {
    const m = await render(
      `<ng-template #action><button type="button">Clear filters</button></ng-template>
       <section mol-empty-state [view]="{ title: 'No matching documents', action: action }"></section>`,
    )
    const markup = m.host.innerHTML
    expect(markup).toContain('No matching documents')
    expect(markup).toContain('<button type="button">Clear filters</button>')
  })

  it('renders only the selected view when a generic title is passed too', async () => {
    // Angular's flat inputs cannot express React's union, so a generic title
    // beside a view is type-valid; the component must still ignore it, as
    // React's `view ?? { … }` does.
    const m = await render(
      `<ng-template #action><button type="button">Clear filters</button></ng-template>
       <section mol-empty-state [title]="'Nothing here'" [view]="{ title: 'No assigned work', action: action }"></section>`,
    )
    const markup = m.host.innerHTML
    expect(markup).toContain('No assigned work')
    expect(markup).not.toContain('Nothing here')
  })
})
