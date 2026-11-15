// @vitest-environment jsdom
/**
 * Unit tests of `MiniCalendar` — the port of
 * `@molecule/app-mini-calendar-react`'s own suite: the same test names and the
 * same assertions. The React suite renders the component with a mocked
 * ClassMap and asserts the markup; this port mounts the same mocked tree
 * through Angular's real renderer (the same `createApplication` + JIT host
 * approach the conformance kit's Angular adapter uses) and asserts the same
 * markup strings.
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
// `textSize`), so tests can assert which cm.* class was applied without a real
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

// The UI-component marker the React suite mocks `@molecule/app-ui-react` with:
// Button renders a plain `<button data-button>` carrying the same aria-label —
// the real Angular Button passes ClassMap tokens to `[class]` bindings, which
// Angular's styling map rejects for the proxy mock's function tokens.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size'],
      host: { 'data-button': '' },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { MiniCalendar } = await import('../mini-calendar.component.js')

/** Hosts mounted so far: each gets its own id, so their definitions never collide (NG0912). */
let hostCount = 0

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the calendar through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MiniCalendar as Type<unknown>],
    host: { 'data-spec-host': String(++hostCount) },
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-mini-calendar
      [selected]="p['selected']"
      [month]="p['month']"
      [locale]="p['locale']"
      [className]="p['className']"
      [isDisabled]="p['isDisabled']"
      [onSelect]="p['onSelect']"
      [onMonthChange]="p['onMonthChange']"
    ></div>`,
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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** Mounts a calendar and registers it for teardown. */
const render = async (props: Record<string, unknown> = {}): Promise<string> => {
  const m = await mount(props)
  mounted.push(m)
  return m.host.innerHTML
}

// Pin the visible month to March 2026 for deterministic grid output.
const march2026 = new Date(2026, 2, 15)

describe('MiniCalendar', () => {
  it('renders the visible month name in the header', async () => {
    const markup = await render({ month: march2026, locale: 'en-US' })
    expect(markup).toContain('March 2026')
  })

  it('renders previous/next month navigation buttons', async () => {
    const markup = await render({ month: march2026 })
    expect(markup).toContain('aria-label="Previous month"')
    expect(markup).toContain('aria-label="Next month"')
  })

  it('renders a 6×7 day grid (42 day buttons)', async () => {
    const markup = await render({ month: march2026 })
    expect(markup.match(/<button(?![^>]*aria-label="(Previous|Next) month")/g) ?? []).toHaveLength(
      42,
    )
  })

  it('marks the selected day with aria-current="date"', async () => {
    const markup = await render({ month: march2026, selected: new Date(2026, 2, 10) })
    expect(markup.match(/aria-current="date"/g) ?? []).toHaveLength(1)
  })

  it('disables days rejected by the isDisabled predicate', async () => {
    const markup = await render({
      month: march2026,
      isDisabled: (d: Date) => d.getDate() === 10 && d.getMonth() === 2,
    })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('forwards className', async () => {
    const markup = await render({ month: march2026, className: 'mc-cls' })
    expect(markup).toContain('mc-cls')
  })
})
