// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components migrated off the static
 * `t` (batch B: RelevantSkillSuggestion → UserAvatar).
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test bonds
 * a provider with an `en` and a `fr` value for a key a migrated component
 * renders, renders it in `en`, switches to `fr` through `act`, and asserts the
 * DOM now shows the French value — it fails against the static-`t` code (the
 * label stays English) and passes against the migrated hook.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { SkillInfo } from '../components/chat-skills-utilities.js'
import { RelevantSkillSuggestion } from '../components/RelevantSkillSuggestion.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** Wrap children in the i18n context (the bonded provider backs it either way). */
function wrap(children: ReactNode): JSX.Element {
  return <I18nProvider provider={provider}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // The static `t` (and, outside an I18nProvider, useTranslation) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ide.chat.skills.load': 'Load' } },
    { code: 'fr', name: 'French', translations: { 'ide.chat.skills.load': 'Charger' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  // Unmount the React tree the proper way so the Tooltip's portal nodes are
  // removed by React itself.
  cleanup()
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('RelevantSkillSuggestion renders the translated Load label after setLocale', async () => {
    const onLoad = vi.fn()
    const onDismiss = vi.fn()
    const { container } = render(
      wrap(<RelevantSkillSuggestion skill={SKILL} onLoad={onLoad} onDismiss={onDismiss} />),
    )
    const load = container.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')

    // The switch the static `t` never re-rendered for; the hook subscribes.
    await act(async () => {
      await provider.setLocale('fr')
    })

    expect(
      (container.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement).textContent,
    ).toBe('Charger')
  })
})
