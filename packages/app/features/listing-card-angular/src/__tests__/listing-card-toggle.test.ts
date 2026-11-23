// @vitest-environment jsdom
/**
 * Unit tests of the Angular listing card's counted toggle — the port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card-toggle.test.tsx`:
 * the same test names and the same behavioral assertions, mounted through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * package's other suite uses) and asserted on the markup the components
 * produce.
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

const { ListingCard } = await import('../listing-card.component.js')
const { ListingCardBody } = await import('../listing-card-body.component.js')
const { ListingGrid } = await import('../listing-grid.component.js')

/** A mounted spec host: its DOM, a change-detection pass and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs a change-detection pass on the mounted app. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component elements + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ListingCard, ListingCardBody, ListingGrid],
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
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Renders one host template and returns the mounted host.
 *
 * @param template - The host template.
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, props)
  mounted.push(m)
  return m
}

/**
 * Flushes pending microtasks and runs a change-detection pass, the way React's
 * `act(async () => …)` settles a pending save.
 *
 * @param m - The mounted host to re-render.
 */
const flush = async (m: Mounted): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  m.tick()
}

/** The two cards of the counted-toggle scenario, the second with no toggle. */
const cardsTpl = `<div mol-listing-grid><div mol-listing-card [toggle]="p['toggle']" [onClick]="p['onClick']" [dataMolId]="p['dataMolId']"><div mol-listing-card-body [title]="'Repair station'"></div></div><div mol-listing-card><div mol-listing-card-body [title]="'Workshop map'"></div></div></div>`

/** A single card with (or without) a toggle. */
const cardTpl = `<div mol-listing-card [toggle]="p['toggle']"><div mol-listing-card-body [title]="p['title']"></div></div>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const labels = { activeLabel: 'Undo endorsement', inactiveLabel: 'Endorse' }

describe('ListingCard counted toggle', () => {
  it('renders the configured button and zero count, saves it, and shows the server count', async () => {
    let saved = { pressed: false, count: 0 }
    const open = vi.fn()
    const commit = vi.fn<(pressed: boolean) => Promise<{ pressed: boolean; count: number }>>(
      async (pressed) => {
        saved = { pressed, count: pressed ? 4 : 3 }
        return saved
      },
    )
    const props = (): Record<string, unknown> => ({
      toggle: { value: saved, commit, ...labels },
      onClick: open,
      dataMolId: 'listing',
    })
    const m = await render(cardsTpl, props())
    const button = m.host.querySelector('button[aria-pressed]')
    expect(button, 'The card must render the configured toggle as a button').toBeInstanceOf(
      HTMLButtonElement,
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing toggle button')
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBe('Endorse 0')
    expect(m.host.querySelectorAll('button')).toHaveLength(1)

    button.click()
    await flush(m)
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    expect(open).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 4')

    const reloadedMounted = await render(cardsTpl, props())
    const reloaded = reloadedMounted.host.querySelector('button')
    expect(reloaded?.textContent).toBe('Undo endorsement 4')
    reloaded?.click()
    await flush(reloadedMounted)
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(reloaded?.textContent).toBe('Endorse 3')
  })

  it('rolls back both the pressed state and the count on a rejected save', async () => {
    let rejectSave!: (error: unknown) => void
    const response = new Promise<never>((_resolve, reject) => {
      rejectSave = reject
    })
    const commit = vi.fn<(pressed: boolean) => Promise<{ pressed: boolean; count: number }>>(
      () => response,
    )
    const onError = vi.fn<(error: unknown) => void>()
    const m = await render(cardTpl, {
      toggle: { value: { pressed: true, count: 6 }, commit, onError, ...labels },
    })
    const button = m.host.querySelector('button')
    expect(button?.textContent).toBe('Undo endorsement 6')
    button?.click()
    m.tick()
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(button?.getAttribute('aria-busy')).toBe('true')
    expect(button?.textContent).toBe('Endorse 5')

    const error = new Error('Save rejected')
    rejectSave(error)
    await flush(m)
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    expect(button?.textContent).toBe('Undo endorsement 6')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('leaves a card that intentionally omits a record field alone', async () => {
    const record = { title: 'Workshop map', endorsed: false, endorsementCount: 14 }
    const m = await render(cardTpl, { title: record.title })
    expect(m.host.textContent).toBe('Workshop map')
    expect(m.host.querySelector('button')).toBeNull()
  })
})
