// @vitest-environment jsdom
/**
 * The Angular `RatingDisplay`'s own text goes through i18n — the port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-i18n.test.tsx`:
 * the same test names and assertions, with the Angular binding's
 * `useTranslation` mocked instead of React's.
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

// Translations the bonded i18n provider would supply: each key maps to a marked string carrying
// the interpolated values, so text that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `«${key}|${values?.value}|${values?.max}»`,
  }),
}))

const { RatingDisplay } = await import('../rating-display.component.js')

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
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RatingDisplay],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
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

const TEMPLATE = `<span mol-rating-display [value]="p['value']" [ariaLabel]="p['ariaLabel']" [onChange]="p['onChange']"></span>`

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/**
 * Renders the component and returns the mounted host (registered for teardown).
 *
 * @param props - The RatingDisplay inputs.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mount(TEMPLATE, props)
  mounted.push(m)
  return m
}

describe('RatingDisplay i18n', () => {
  it('takes the container label through t() with the rating and max', async () => {
    const m = await render({ value: 3.5 })
    // The container is the inner stars span: the root span carries no role.
    const root = m.host.querySelector('span[role]')
    expect(root?.getAttribute('aria-label')).toBe('«ratingDisplay.aria.rating|3.5|5»')
  })

  it("takes each interactive star's label through t() with the star and max", async () => {
    const m = await render({ value: 2, onChange: () => {} })
    const labels = Array.from(m.host.querySelectorAll('button')).map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(labels).toContain('«ratingDisplay.aria.rate|1|5»')
    expect(labels).toContain('«ratingDisplay.aria.rate|5|5»')
  })

  it('lets an explicit ariaLabel override the translated container label', async () => {
    const m = await render({ value: 4, ariaLabel: 'Four stars' })
    // The container is the inner stars span: the root span carries no role.
    const root = m.host.querySelector('span[role]')
    expect(root?.getAttribute('aria-label')).toBe('Four stars')
  })
})
