// @vitest-environment jsdom
/**
 * The Angular `Breadcrumb`'s own text goes through i18n — the port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb-i18n.test.tsx`:
 * the same test name and assertion, with the Angular binding's
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
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

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { Breadcrumb } = await import('../breadcrumb.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
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
    imports: [Breadcrumb],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class DefaultHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('Breadcrumb i18n', () => {
  it('takes the nav label through i18n by default', async () => {
    const m = await mount(`<nav mol-breadcrumb [items]="p['items']"></nav>`, { items })
    mounted.push(m)
    const nav = m.host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«breadcrumb.aria.breadcrumb»')
    expect(nav!.getAttribute('aria-label')).not.toBe('Breadcrumb')
  })
})
