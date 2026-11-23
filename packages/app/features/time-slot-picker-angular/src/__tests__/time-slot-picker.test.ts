// @vitest-environment jsdom
/**
 * Unit tests of the Angular `TimeSlotPicker` — the port of
 * `@molecule/app-time-slot-picker-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer and asserts the same
 * markup strings.
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

// `t(key, values, opts)` falls back to the supplied `defaultValue`, as the i18n
// core does for a key with no translation.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TimeSlotPicker } = await import('../time-slot-picker.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []
/** Counter making each JIT host's component id unique (Angular's NG0912). */
let hostCount = 0

/**
 * Mounts the picker through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TimeSlotPicker],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template: `<div mol-time-slot-picker [slots]="p['slots']" [selectedId]="p['selectedId']" [onSelect]="p['onSelect']" [layout]="p['layout']" [columns]="p['columns']" [title]="p['title']" [className]="p['className']"></div>`,
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
  await appRef.whenStable()
  appRef.tick()
  const entry: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const slots = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true },
]

describe('TimeSlotPicker', () => {
  it('renders a radiogroup with one radio per slot', async () => {
    const m = await render({ slots, onSelect: () => {} })
    expect(m.host.innerHTML).toContain('role="radiogroup"')
    expect(m.host.innerHTML.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('renders each slot label and the optional meta line', async () => {
    const m = await render({ slots, onSelect: () => {} })
    expect(m.host.innerHTML).toContain('Morning (9–12)')
    expect(m.host.innerHTML).toContain('Free')
    expect(m.host.innerHTML).toContain('Afternoon (1–5)')
  })

  it('marks the selected slot with aria-checked', async () => {
    const m = await render({ slots, onSelect: () => {}, selectedId: 'pm' })
    expect(m.host.innerHTML.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('disables a slot flagged disabled', async () => {
    const m = await render({ slots, onSelect: () => {} })
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('renders the title when present and omits it otherwise', async () => {
    const titled = await render({ slots, onSelect: () => {}, title: 'Pick a time' })
    expect(titled.host.innerHTML).toContain('Pick a time')
    const plain = await render({ slots, onSelect: () => {} })
    expect(plain.host.innerHTML).not.toContain('<h3')
  })

  it('forwards className', async () => {
    const m = await render({ slots, onSelect: () => {}, className: 'tsp-cls' })
    expect(m.host.innerHTML).toContain('tsp-cls')
  })
})
