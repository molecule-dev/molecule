// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components migrated off the static
 * `t` — the Solid counterpart of
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-b.test.tsx`,
 * with the same test name and the same assertions.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from `@molecule/app-solid`
 * subscribes through the provider's locale notifications, so a component
 * reading `t` from the hook re-renders on the switch. This test bonds a
 * provider with an `en` and a `fr` value for a key the component renders,
 * renders it in `en`, switches to `fr`, and asserts the DOM now shows the
 * French value — it fails against static-`t` code (the label stays English) and
 * passes against the migrated hook.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { RelevantSkillSuggestionProps } from '../parts/RelevantSkillSuggestion.jsx'
import { RelevantSkillSuggestion } from '../parts/RelevantSkillSuggestion.jsx'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

/**
 * Render the suggestion the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The mounted host element.
 */
function renderSuggestion(props: RelevantSkillSuggestionProps): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(() => <RelevantSkillSuggestion {...props} />, container)
  return container
}

/**
 * Lets Solid's queued effects settle before the assertions.
 *
 * @returns Nothing, once the queue has drained.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  // The static `t` (and, outside an i18n context, useTranslation) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: { 'ide.chat.skills.load': 'Load' },
    },
    {
      code: 'fr',
      name: 'French',
      direction: 'ltr',
      translations: { 'ide.chat.skills.load': 'Charger' },
    },
  ])
  setProvider(provider)
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('RelevantSkillSuggestion renders the translated Load label after setLocale', async () => {
    const onLoad = vi.fn<(skill: SkillInfo) => void>()
    const onDismiss = vi.fn<(skill: SkillInfo) => void>()
    const host = renderSuggestion({ skill: SKILL, onLoad, onDismiss })
    const load = host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')

    // The switch the static `t` never re-rendered for; the hook subscribes.
    await provider.setLocale('fr')
    await settle()

    expect(
      (host.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement).textContent,
    ).toBe('Charger')
  })
})
