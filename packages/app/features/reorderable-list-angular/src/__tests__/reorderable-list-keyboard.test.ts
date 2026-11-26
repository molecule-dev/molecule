// @vitest-environment jsdom
/**
 * Keyboard-reordering behavior (the L115b fix), ported from
 * `@molecule/app-reorderable-list-react`'s own suite: the list must be
 * reorderable without a mouse. These mount with Angular's real renderer in
 * jsdom and drive the real move controls + the Alt+Arrow key path, asserting
 * `onReorder` fires with the reordered array, that every move button announces
 * its row's position, and that focus follows the item after a move.
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
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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
        // At runtime a ClassMap value IS a string (`cm.srOnly` = 'sr-only');
        // parametrized tokens stay callable (`cm.stack(1)`) but stringify to
        // their token, so frameworks that write class through String(fn)
        // (Solid, Svelte, Angular) render the token, not the function source.
        const value = (..._args: unknown[]) => token
        value.toString = () => token
        return value
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

const { ReorderableList } = await import('../reorderable-list.component.js')

interface Row {
  label: string
}

const makeItems = (): { id: string; data: Row }[] => [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
  { id: 'c', data: { label: 'Gamma' } },
]

/** One distinct selector per mount, so Angular sees a different component id. */
let mountCount = 0

/** A mounted list: its host element, a re-tick, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The props the host template binds (mutate, then {@link Mounted.tick}). */
  readonly props: Record<string, unknown>
  /** Re-runs change detection after {@link Mounted.props} changed. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a list through a JIT host template with the given props, written
 * exactly the way an Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountWith(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${mountCount++}`,
    standalone: true,
    imports: [ReorderableList as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<ng-template #row let-item="a0"><span [attr.data-item]="item.id">{{ item.data.label }}</span></ng-template>
      <ul mol-reorderable-list [items]="p['items']" [onReorder]="p['onReorder']" [renderItem]="row"></ul>`,
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
    props,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** Mounts a list with the given `onReorder`. */
const mount = async (onReorder: (next: { id: string; data: Row }[]) => void): Promise<Mounted> =>
  mountWith({ items: makeItems(), onReorder })

/** Mounts the stateful list: `onReorder`'s result feeds back into `items`. */
const mountStateful = async (): Promise<Mounted> => {
  const props: Record<string, unknown> = { items: makeItems() }
  props['onReorder'] = (next: { id: string; data: Row }[]): void => {
    props['items'] = next
  }
  return mountWith(props)
}

const order = (call: unknown): string[] => (call as { id: string }[]).map((i) => i.id)

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ReorderableList keyboard reordering (L115b)', () => {
  it('moves an item DOWN when its move-down button is activated (no mouse)', async () => {
    const onReorder = vi.fn()
    const m = await mount(onReorder)
    mounted.push(m)
    const down = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    down.click()
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])
  })

  it('moves an item UP when its move-up button is activated', async () => {
    const onReorder = vi.fn()
    const m = await mount(onReorder)
    mounted.push(m)
    const up = m.host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    up.click()
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['a', 'c', 'b'])
  })

  it('reorders via Alt+ArrowDown / Alt+ArrowUp on a move button; plain arrows do NOT', async () => {
    const onReorder = vi.fn()
    const m = await mount(onReorder)
    mounted.push(m)
    const downA = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    downA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])

    const upC = m.host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    upC.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }))
    expect(order(onReorder.mock.calls[1]![0])).toEqual(['a', 'c', 'b'])

    // A plain arrow (no Alt) and an unrelated Alt+letter must not reorder —
    // the shortcut is Alt+Arrow on the button, nothing else.
    onReorder.mockClear()
    downA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    downA.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true }))
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('describes each move button with its row position', async () => {
    const m = await mount(() => {})
    mounted.push(m)
    // The accessible description of a row's move buttons is that row's
    // position ("Item 2 of 3"), taken from the row's sr-only position span.
    const down = m.host.querySelector('[data-mol-id="reorderable-move-down-b"]')
    const up = m.host.querySelector('[data-mol-id="reorderable-move-up-b"]')
    const upC = m.host.querySelector('[data-mol-id="reorderable-move-up-c"]')
    const described = down?.getAttribute('aria-describedby') ?? ''
    expect(described).toBeTruthy()
    expect(document.getElementById(described)?.textContent).toBe('Item 2 of 3')
    expect(up?.getAttribute('aria-describedby')).toBe(described)
    expect(document.getElementById(upC?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Item 3 of 3',
    )
  })

  it('disables and does not fire from the boundary buttons', async () => {
    const onReorder = vi.fn()
    const m = await mount(onReorder)
    mounted.push(m)
    const firstUp = m.host.querySelector(
      '[data-mol-id="reorderable-move-up-a"]',
    ) as HTMLButtonElement
    const lastDown = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-c"]',
    ) as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
    firstUp.click()
    lastDown.click()
    expect(onReorder).not.toHaveBeenCalled()
  })
})

describe('ReorderableList focus follows the item', () => {
  it('a move that disables the used button leaves focus on that item’s other button', async () => {
    const m = await mountStateful()
    mounted.push(m)
    // Row 2 of 3's "Move down" moves `b` to the end: its move-down disables,
    // and focus settles on the same item's move-up.
    const down = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-b"]',
    ) as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    down.click()
    m.tick()
    const up = m.host.querySelector('[data-mol-id="reorderable-move-up-b"]') as HTMLButtonElement
    expect(up.disabled).toBe(false)
    expect(document.activeElement).toBe(up)
  })

  it('a move that keeps the used button enabled keeps focus on it', async () => {
    const m = await mountStateful()
    mounted.push(m)
    // Row 1 of 3's "Move down" moves `a` into the middle: the same button stays
    // enabled (the row is keyed by item id, so it moves with its row).
    const down = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    down.click()
    m.tick()
    const downAfter = m.host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    expect(downAfter.disabled).toBe(false)
    expect(document.activeElement).toBe(downAfter)
  })
})
