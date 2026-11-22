// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components migrated off the static
 * `t` — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-b.test.tsx` with
 * the same test name and the same behavioral assertion.
 *
 * A component reading `t` from `useTranslation()` subscribes to the provider's
 * locale notifications, so after `setLocale('fr')` it re-renders in the new
 * language. This test bonds a provider with an `en` and a `fr` value for a key
 * a migrated component renders, renders it in `en`, switches to `fr`, and
 * asserts the DOM now shows the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { RelevantSkillSuggestion } from '../parts/RelevantSkillSuggestion.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Mount the suggestion the way ChatPanel does.
 *
 * @param onLoad - The Load callback.
 * @param onDismiss - The dismiss callback.
 * @returns The host element.
 */
function renderSuggestion(onLoad: () => void, onDismiss: () => void): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(RelevantSkillSuggestion, {
          skill: SKILL,
          onLoad,
          onDismiss,
        }),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
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
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('RelevantSkillSuggestion renders the translated Load label after setLocale', async () => {
    const onLoad = vi.fn()
    const onDismiss = vi.fn()
    const host = renderSuggestion(onLoad, onDismiss)
    const load = host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')

    // The switch the static `t` never re-rendered for; the composable subscribes.
    await provider.setLocale('fr')
    await nextTick()

    expect(
      (host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement).textContent,
    ).toBe('Charger')
  })
})
