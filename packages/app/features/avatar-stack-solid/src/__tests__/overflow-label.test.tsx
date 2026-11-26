// @vitest-environment jsdom
/**
 * The Solid `AvatarStack`'s overflow chip reads both of its strings from the
 * `avatarStack.*` translations — the counterpart of
 * `@molecule/app-avatar-stack-react/src/__tests__/overflow-label.test.tsx`,
 * with the same test name.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock avatar-stack.test.tsx uses.
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

// `Avatar` is the only `@molecule/app-ui-solid` dependency — the same stub
// avatar-stack.test.tsx uses.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: (props: { src?: string; name?: string }) => (
    <img data-avatar={props.src ?? ''} data-avatar-name={props.name ?? ''} />
  ),
}))

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

import type { I18nProvider, Translations } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { AvatarStack } = await import('../AvatarStack.jsx')

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

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so the French
  // values can't bleed into the next test.
  setProvider(createSimpleI18nProvider('en'))
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const container = mount(() => <AvatarStack people={people} max={4} />)
    const chip = container.querySelector('span[aria-label]')
    if (!chip) throw new Error('no overflow chip rendered')
    // Six people, four visible: the count goes where the French value puts {{count}}.
    expect(chip.getAttribute('aria-label')).toBe('+2 de plus')
    expect(chip.textContent).toBe('»2')

    // The mounted chip follows the provider. English carries no value for
    // either key, so the component's own defaults render.
    await provider.setLocale('en')
    await Promise.resolve()
    expect(chip.getAttribute('aria-label')).toBe('+2 more')
    expect(chip.textContent).toBe('+2')
  })
})
