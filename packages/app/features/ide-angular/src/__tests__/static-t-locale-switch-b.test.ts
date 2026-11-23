// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components migrated off the static
 * `t` — the Angular port of
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-b.test.tsx` with
 * the same test name and the same behavioral assertion.
 *
 * A component reading `t` from `useTranslation()` subscribes to the provider's
 * locale notifications, so after `setLocale('fr')` it re-renders in the new
 * language. This test bonds a provider with an `en` and a `fr` value for a key
 * a migrated component renders, renders it in `en`, switches to `fr`, flushes
 * change detection, and asserts the DOM now shows the French value.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
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

import { provideDomPlacement } from '@molecule/app-angular'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { RelevantSkillSuggestion } from '../parts/relevant-skill-suggestion.component.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** The JIT host's template binds every input the suggestion takes. */
const SuggestionHost = Component({
  selector: 'mol-static-t-suggestion-host',
  standalone: true,
  imports: [RelevantSkillSuggestion],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-relevant-skill-suggestion [skill]="p['skill']" [onLoad]="p['onLoad']" [onDismiss]="p['onDismiss']"></div>`,
})(
  class SuggestionHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof SuggestionHost>>
  container: HTMLElement
} | null = null

/**
 * Lets Angular's zoneless change detection settle.
 */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mount the suggestion the way ChatPanel does.
 *
 * @param onLoad - The Load callback.
 * @param onDismiss - The dismiss callback.
 * @returns The host element.
 */
async function renderSuggestion(onLoad: () => void, onDismiss: () => void): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof SuggestionHost>> = createComponent(SuggestionHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { skill: SKILL, onLoad, onDismiss }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [] }),
      },
    ),
  )
  // The static `t` (and, outside an I18nProvider, useTranslation) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ide.chat.skills.load': 'Load' } },
    { code: 'fr', name: 'French', translations: { 'ide.chat.skills.load': 'Charger' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('RelevantSkillSuggestion renders the translated Load label after setLocale', async () => {
    const onLoad = vi.fn()
    const onDismiss = vi.fn()
    const host = await renderSuggestion(onLoad, onDismiss)
    const load = host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')

    // The switch the static `t` never re-rendered for; the hook subscribes.
    await provider.setLocale('fr')
    await flush()

    expect(
      (host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement).textContent,
    ).toBe('Charger')
  })
})
