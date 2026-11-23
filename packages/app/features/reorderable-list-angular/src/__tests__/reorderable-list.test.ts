// @vitest-environment jsdom
/**
 * Unit tests of `ReorderableList` — the port of
 * `@molecule/app-reorderable-list-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings. The render functions are
 * templates, the way an Angular app passes them.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// interpolates the inline English default.
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

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** One distinct selector per mount, so Angular sees a different component id. */
let mountCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + templates).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${mountCount++}`,
    standalone: true,
    imports: [ReorderableList as Type<unknown>],
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

const mounted: Mounted[] = []

const items = [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
]

/** The row renderer template an app writes: a labelled span carrying the item id. */
const ROW = `<ng-template #row let-item="a0"><span [attr.data-item]="item.id">{{ item.data.label }}</span></ng-template>`

/** The drag handle template an app writes: a "≡" glyph. */
const HANDLE = `<ng-template #handle><span data-handle>≡</span></ng-template>`

/**
 * Mounts a list with the given props and row renderer.
 *
 * @param props - The list's props.
 * @param handle - Whether to pass a drag handle template too.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, handle = false): Promise<Mounted> => {
  const m = await mount(
    `${ROW}${handle ? HANDLE : ''}<ul mol-reorderable-list [items]="p['items']" [onReorder]="p['onReorder']" [renderItem]="row" [renderHandle]="${handle ? 'handle' : 'null'}" [className]="p['className']"></ul>`,
    { items, onReorder: () => {}, ...props },
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ReorderableList', () => {
  it('renders a list with one row per item', async () => {
    const markup = (await render()).host.innerHTML
    expect(markup).toContain('data-item="a"')
    expect(markup).toContain('data-item="b"')
    expect(markup).toContain('Alpha')
    expect(markup).toContain('Beta')
  })

  it('renders a plain list: no role on the ul, no role or tabindex on the rows', async () => {
    const { host } = await render()
    const markup = host.innerHTML
    // A `ul` already is a list (role="list" would be redundant) and a row is a
    // plain `li`: the drag handlers live on it, but it is not a focusable
    // widget — the move buttons are. The host `<ul>` itself carries no role
    // either (Angular renders it as the host attribute).
    expect(markup.match(/<li[^>]*role=/g)).toBeNull()
    expect(markup.match(/<li[^>]*tabindex=/g)).toBeNull()
    expect(markup.match(/<li[^>]*aria-selected=/g)).toBeNull()
    expect(host.getAttribute('role')).toBeNull()
  })

  it('makes the whole row draggable when no renderHandle is supplied', async () => {
    const markup = (await render()).host.innerHTML
    expect(markup.match(/<li[^>]*draggable="true"/g) ?? []).toHaveLength(2)
  })

  it('renders a drag handle and non-draggable rows when renderHandle is supplied', async () => {
    const markup = (await render({}, true)).host.innerHTML
    expect(markup).toContain('data-handle=""')
    expect(markup).toContain('aria-label="Drag to reorder"')
    expect(markup).not.toMatch(/<li[^>]*draggable="true"/)
  })

  it('forwards className onto the <ul>', async () => {
    const markup = (await render({ className: 'rl-cls' })).host.innerHTML
    expect(markup).toContain('rl-cls')
  })

  it('renders keyboard-accessible move controls with aria + data-mol-id, disabled at the edges', async () => {
    const { host } = await render()
    const markup = host.innerHTML
    // Every row exposes move-up/move-down buttons the finding requires.
    expect(markup).toContain('data-mol-id="reorderable-move-up-a"')
    expect(markup).toContain('data-mol-id="reorderable-move-down-a"')
    expect(markup).toContain('data-mol-id="reorderable-move-up-b"')
    expect(markup).toContain('data-mol-id="reorderable-move-down-b"')
    expect(markup).toContain('aria-label="Move up"')
    expect(markup).toContain('aria-label="Move down"')
    // First row's up + last row's down are disabled (boundary guards).
    // Angular writes the attribute before `data-mol-id`, so read it off the
    // element — the same "the button carries `disabled`" the React regex says.
    const firstUp = host.querySelector('[data-mol-id="reorderable-move-up-a"]')
    const lastDown = host.querySelector('[data-mol-id="reorderable-move-down-b"]')
    expect(firstUp?.hasAttribute('disabled')).toBe(true)
    expect(lastDown?.hasAttribute('disabled')).toBe(true)
  })

  it('describes each move button with its row position, rendered in an sr-only span', async () => {
    const { host } = await render()
    const markup = host.innerHTML
    // The row's position text ("Item 1 of 2") sits in a screen-reader-only
    // span as the row's last child; both of the row's move buttons point at it
    // through aria-describedby, and each row references its own span.
    const described = [...markup.matchAll(/aria-describedby="([^"]*)"/g)].map((m) => m[1])
    expect(described).toHaveLength(4)
    expect(new Set(described).size).toBe(2)
    // Angular applies `[class]` before `[attr.id]` (styling bindings come
    // first), so the id is matched anywhere in the tag, not just first.
    const spans = [...markup.matchAll(/<span [^>]*id="([^"]*)"[^>]*>Item (\d) of \d<\/span>/g)]
    expect(spans.map((m) => [m[1], Number(m[2])])).toEqual([
      [described[0], 1],
      [described[2], 2],
    ])
    // The position span is the row's last element child.
    const rows = host.querySelectorAll('li')
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      const last = row.lastElementChild
      expect(last?.tagName).toBe('SPAN')
      expect(last?.getAttribute('id')).toBeTruthy()
      expect(described).toContain(last?.getAttribute('id') ?? '')
    }
  })
})
