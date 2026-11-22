// @vitest-environment jsdom
/**
 * Unit tests of `HabitStreakCard` — the port of
 * `@molecule/app-habit-streak-card-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    // The provider's contract: the inline English default, `{{placeholders}}`
    // filled from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const base = opts?.defaultValue ?? key
      if (!values) return base
      return base.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) =>
        k in values ? String(values[k]) : m,
      )
    },
  }),
}))

const { HabitStreakCard } = await import('../habit-streak-card.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component type.
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * The card's bindings template, shared by every render below.
 *
 * @param children - The projected content.
 * @returns The host template.
 */
const card = (children = ''): string =>
  `<div mol-habit-streak-card [name]="p['name']" [icon]="p['icon']" [currentStreak]="p['currentStreak']" [bestStreak]="p['bestStreak']" [totalCompletions]="p['totalCompletions']" [heatmap]="p['heatmap']" [heatmapDays]="p['heatmapDays']" [className]="p['className']">${children}</div>`

/**
 * Mounts a {@link HabitStreakCard} with the given props and projected content.
 *
 * @param props - The card's props.
 * @param children - The projected content.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(card(children), HabitStreakCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('HabitStreakCard', () => {
  it('renders the habit name in an <h3> and the current streak', async () => {
    const m = await render({ name: 'Meditate', currentStreak: 7 })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Meditate')
    expect(m.host.innerHTML).toContain('7')
    expect(m.host.innerHTML).toContain('day streak')
  })

  it('renders the icon slot', async () => {
    const m = await render({ name: 'M', currentStreak: 1 }, '<span slot="icon" data-icon></span>')
    expect(m.host.innerHTML).toContain('data-icon=""')
  })

  it('renders best streak and total completions when present and omits them otherwise', async () => {
    const full = await render({
      name: 'M',
      currentStreak: 5,
      bestStreak: 30,
      totalCompletions: 120,
    })
    expect(full.host.innerHTML).toContain('30')
    expect(full.host.innerHTML).toContain('best')
    expect(full.host.innerHTML).toContain('120')
    expect(full.host.innerHTML).toContain('total')
    const bare = await render({ name: 'M', currentStreak: 5 })
    expect(bare.host.innerHTML).not.toContain('best')
    expect(bare.host.innerHTML).not.toContain('total')
  })

  it('renders a heatmap square per day when a heatmap is supplied', async () => {
    const m = await render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    expect(m.host.innerHTML).toContain('aria-label="2026-05-01: 0"')
    expect(m.host.innerHTML).toContain('aria-label="2026-05-02: 3"')
  })

  it('gives the heatmap strip a group role and each day square an img role', async () => {
    const m = await render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    // The strip is a named group; each square is a named image, which lets
    // aria-label and title stay on them (axe's aria-prohibited-attr).
    expect(m.host.innerHTML).toMatch(/<div[^>]*role="group"[^>]*aria-label="Recent activity"/)
    expect(m.host.innerHTML).toMatch(/<span[^>]*role="img"[^>]*aria-label="2026-05-01: 0"/)
    expect(m.host.innerHTML).toMatch(/<span[^>]*role="img"[^>]*title="2026-05-02: 3"/)
  })

  it('truncates the heatmap to the heatmapDays window from the end', async () => {
    const m = await render({
      name: 'M',
      currentStreak: 1,
      heatmapDays: 2,
      heatmap: [
        { date: 'd1', count: 1 },
        { date: 'd2', count: 1 },
        { date: 'd3', count: 1 },
      ],
    })
    expect(m.host.innerHTML).not.toContain('aria-label="d1')
    expect(m.host.innerHTML).toContain('aria-label="d2: 1"')
    expect(m.host.innerHTML).toContain('aria-label="d3: 1"')
  })

  it('forwards className onto the Card', async () => {
    const m = await render({ name: 'M', currentStreak: 1, className: 'hsc-cls' })
    expect(m.host.innerHTML).toContain('hsc-cls')
  })
})
