// @vitest-environment jsdom
/**
 * i18n for the Angular `NoteCard`'s own text — a port of
 * `@molecule/app-note-card-react/src/__tests__/note-card-i18n.test.tsx`: the
 * same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the other suites use).
 * The pinned marker's accessible label goes through `t()`; the provider here
 * marks every translation it serves (`«key»`), so a string that bypassed
 * `t()` shows up as plain English.
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

import { provideDomPlacement } from '@molecule/app-angular'

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

const { NoteCard } = await import('../note-card.component.js')

/** A mounted spec host: its DOM, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Mounted hosts, torn down after each test. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** Mounts a pinned {@link NoteCard} and returns its host. */
const pinnedCard = async (): Promise<Mounted> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [NoteCard as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<article mol-note-card body="b" [pinned]="true"></article>`,
  })(class SpecHost {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

describe('NoteCard i18n', () => {
  it('takes the pinned marker label through i18n by default', async () => {
    const m = await pinnedCard()
    expect(m.host.innerHTML).toContain('aria-label="«noteCard.aria.pinned»"')
  })

  it('renders the pinned marker with an image role so screen readers announce the label', async () => {
    const m = await pinnedCard()
    expect(m.host.innerHTML).toContain('role="img"')
  })
})
