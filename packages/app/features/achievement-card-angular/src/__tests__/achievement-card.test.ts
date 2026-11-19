// @vitest-environment jsdom
/**
 * Unit tests of `AchievementCard` — the port of
 * `@molecule/app-achievement-card-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with the mocked ClassMap the React suite uses.
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
// `flex`), so tests can assert which cm.* class was applied without a real
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { AchievementCard } = await import('../achievement-card.component.js')

/** The host template: an icon projected into `[slot=icon]`, and the props bound. */
const TEMPLATE = `<div mol-achievement-card [name]="p['name']" [description]="p['description']" [earned]="p['earned']" [earnedAt]="p['earnedAt']" [earnedLabel]="p['earnedLabel']" [lockedLabel]="p['lockedLabel']" [progress]="p['progress']" [tier]="p['tier']" [className]="p['className']"><ng-container ngProjectAs="[slot=icon]"><span data-icon=""></span></ng-container></div>`

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection (after a locale switch, say). */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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
    flush: () => appRef.tick(),
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The component's own host element (the Card `div`). */
const cardEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-achievement-card]')
  if (!el) throw new Error('no AchievementCard host rendered')
  return el as HTMLElement
}

const mounted: Mounted[] = []

/**
 * Mounts an {@link AchievementCard} and remembers it for teardown.
 *
 * @param props - The card props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(AchievementCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AchievementCard', () => {
  it('renders the name inside an <h3>', async () => {
    const m = await render({ name: 'First Win' })
    const markup = m.host.innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('First Win')
  })

  it('renders the icon slot', async () => {
    const m = await render({ name: 'X' })
    expect(m.host.innerHTML).toContain('data-icon')
  })

  it('renders the description and tier when present and omits them otherwise', async () => {
    const full = await render({ name: 'X', description: 'desc-x', tier: 'Legendary' })
    expect(full.host.innerHTML).toContain('desc-x')
    expect(full.host.innerHTML).toContain('Legendary')
    const bare = await render({ name: 'X' })
    expect(bare.host.innerHTML).not.toContain('desc-x')
    expect(bare.host.innerHTML).not.toContain('Legendary')
  })

  it('shows the earned-at line when earned', async () => {
    const m = await render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(m.host.innerHTML).toContain('Earned')
    expect(m.host.innerHTML).toContain('Jan 1')
  })

  it('shows a progress bar when not earned and progress is supplied', async () => {
    const m = await render({ name: 'X', progress: { value: 3, max: 4 } })
    expect(m.host.innerHTML).toContain('width: 75%')
    expect(m.host.innerHTML).not.toContain('Locked')
  })

  it('shows "Locked" when not earned and no progress is supplied', async () => {
    const m = await render({ name: 'X' })
    expect(m.host.innerHTML).toContain('Locked')
  })

  it('greys out the card via inline style only when not earned', async () => {
    const locked = await render({ name: 'X' })
    expect(cardEl(locked.host).getAttribute('style')).toContain('grayscale')
    const earned = await render({ name: 'X', earned: true })
    expect(cardEl(earned.host).getAttribute('style') ?? '').not.toContain('grayscale')
  })

  it('forwards className onto the Card', async () => {
    const m = await render({ name: 'X', className: 'ac-cls' })
    expect(cardEl(m.host).getAttribute('class')).toContain('ac-cls')
  })

  it('renders the default "Earned" label via t() defaultValue', async () => {
    const m = await render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(m.host.innerHTML).toContain('Earned')
  })

  it('lets earnedLabel / lockedLabel props override the status labels (prop wins)', async () => {
    const earnedMarkup = await render({
      name: 'X',
      earned: true,
      earnedAt: 'Jan 1',
      earnedLabel: 'Unlocked',
    })
    expect(earnedMarkup.host.innerHTML).toContain('Unlocked')
    expect(earnedMarkup.host.innerHTML).not.toContain('Earned')

    const lockedMarkup = await render({ name: 'X', lockedLabel: 'Not yet' })
    expect(lockedMarkup.host.innerHTML).toContain('Not yet')
    expect(lockedMarkup.host.innerHTML).not.toContain('Locked')
  })

  it('lets a locale bond override the status labels', async () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'achievementCard.earned': 'Obtenido',
            'achievementCard.locked': 'Bloqueado',
          },
        },
      ]),
    )
    const earnedMarkup = await render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(earnedMarkup.host.innerHTML).toContain('Obtenido')
    expect(earnedMarkup.host.innerHTML).not.toContain('Earned')

    const lockedMarkup = await render({ name: 'X' })
    expect(lockedMarkup.host.innerHTML).toContain('Bloqueado')
    expect(lockedMarkup.host.innerHTML).not.toContain('Locked')
  })
})
