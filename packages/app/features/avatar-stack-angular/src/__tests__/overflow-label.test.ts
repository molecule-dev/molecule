// @vitest-environment jsdom
/**
 * The Angular `AvatarStack`'s overflow chip reads both of its strings from the
 * `avatarStack.*` translations — the counterpart of
 * `@molecule/app-avatar-stack-react/src/__tests__/overflow-label.test.tsx`,
 * with the same test name. The component mounts through Angular's real
 * renderer (the `createApplication` + JIT host approach avatar-stack.test.ts
 * uses) against the same mocked UI dependencies.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppUiAngular from '@molecule/app-ui-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock avatar-stack.test.ts uses.
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

// `Avatar` is the only `@molecule/app-ui-angular` component `AvatarStack`
// imports — stub it to an inspectable `<div>` carrying the supplied src + name,
// as avatar-stack.test.ts does. Everything else is the real bundle.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppUiAngular>()
  const { Component } = await import('@angular/core')
  return {
    ...actual,
    Avatar: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-avatar]',
      standalone: true,
      inputs: ['src', 'alt', 'name', 'size'],
      host: {
        '[attr.data-avatar]': 'src ?? ""',
        '[attr.data-avatar-name]': 'name ?? ""',
      },
      template: '',
    })(
      class MockAvatar {
        /** Image source. */
        src?: string
        /** Alt text. */
        alt?: string
        /** Display name. */
        name?: string
        /** Size preset. */
        size?: unknown
      },
    ),
  }
})

const { AvatarStack } = await import('../avatar-stack.component.js')

/** French values for both keys. Neither equals its English default. */
const FRENCH: Translations = {
  'avatarStack.more': '+{{count}} de plus',
  'avatarStack.overflowPrefix': '»',
}

/** The bonded provider from `beforeEach`, so a locale switch drives the one the chip reads. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('fr', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: FRENCH },
  ])
  setProvider(provider)
})

/** A mounted stack: its host element, a change-detection flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so the French
  // values can't bleed into the next test.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts `<div mol-avatar-stack>` through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param props - The props the host template binds as `p['name']`.
 * @returns The mounted stack.
 */
async function mountStack(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AvatarStack],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-avatar-stack [people]="p['people']" [max]="p['max']" [size]="p['size']" [className]="p['className']"></div>`,
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
  const host: HTMLElement = ref.location.nativeElement
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

const people = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Carol' },
  { name: 'Dave' },
  { name: 'Eve' },
  { name: 'Frank' },
]

describe('AvatarStack', () => {
  it('translates the overflow label through the avatarStack keys', async () => {
    const m = await mountStack({ people, max: 4 })
    mounted.push(m)
    const chip = m.host.querySelector('span[aria-label]')
    if (!chip) throw new Error('no overflow chip rendered')
    // Six people, four visible: the count goes where the French value puts {{count}}.
    expect(chip.getAttribute('aria-label')).toBe('+2 de plus')
    expect(chip.textContent).toBe('»2')

    // The mounted chip follows the provider. English carries no value for
    // either key, so the component's own defaults render.
    await provider.setLocale('en')
    m.tick()
    expect(chip.getAttribute('aria-label')).toBe('+2 more')
    expect(chip.textContent).toBe('+2')
  })
})
