// @vitest-environment jsdom
/**
 * Every string the Angular `HabitStreakCard` writes itself goes through i18n —
 * a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
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

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

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

describe('HabitStreakCard i18n', () => {
  it('takes the heatmap strip label through i18n by default', async () => {
    const m = await render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 1 },
        { date: '2026-05-02', count: 2 },
      ],
    })
    expect(m.host.innerHTML).toContain('aria-label="«habit.aria.recentActivity»"')
  })

  it('takes each heatmap day label through i18n by default', async () => {
    const m = await render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    // The one day-label key feeds both the announced label and the tooltip.
    expect(m.host.innerHTML).toContain('aria-label="«habit.cell.tooltip»"')
    expect(m.host.innerHTML).toContain('title="«habit.cell.tooltip»"')
    expect(m.host.innerHTML).not.toContain('aria-label="2026-05-01: 0"')
    expect(m.host.innerHTML).not.toContain('title="2026-05-02: 3"')
  })
})
