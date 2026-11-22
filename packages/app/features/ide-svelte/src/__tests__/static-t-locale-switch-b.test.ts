// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components mounted on the reactive
 * translation hook (batch B: RelevantSkillSuggestion) — a port of
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-b.test.tsx`
 * with the same test name and the same behavioral assertions.
 *
 * In Svelte the counterpart of React's `useTranslation()` is
 * `@molecule/app-svelte`'s `useTranslation`, whose `t` reads a locale-version
 * store, so markup that calls it re-runs on a locale switch. This test bonds a
 * provider with an `en` and a `fr` value for a key a reactive component renders,
 * mounts it in `en`, switches to `fr`, and asserts the DOM now shows the French
 * value — it fails against a component that reads a value frozen at mount.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import RelevantSkillSuggestion from '../parts/RelevantSkillSuggestion.svelte'
import type { RelevantSkillSuggestionProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component reads. */
let provider: I18nProviderType

const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** The mounts alive right now, torn down before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

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
  // The hook (outside an i18n context) reads the bonded provider, so bond one
  // with both tables before rendering.
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

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mount the suggestion the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The mounted host element.
 */
function renderSuggestion(props: Partial<RelevantSkillSuggestionProps>): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(RelevantSkillSuggestion, {
    target: container,
    props: props as RelevantSkillSuggestionProps,
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('components migrated off a static t re-render on a locale switch', () => {
  it('RelevantSkillSuggestion renders the translated Load label after setLocale', async () => {
    const onLoad = vi.fn()
    const onDismiss = vi.fn()
    const container = renderSuggestion({ skill: SKILL, onLoad, onDismiss })
    const load = container.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement
    expect(load.textContent).toBe('Load')

    // The switch a value frozen at mount never followed; the hook subscribes.
    await provider.setLocale('fr')
    flushSync()

    expect(
      (container.querySelector('[data-mol-id="relevant-skill-load"]') as HTMLElement).textContent,
    ).toBe('Charger')
  })
})
