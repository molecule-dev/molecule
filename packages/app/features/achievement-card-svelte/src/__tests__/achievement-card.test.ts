// @vitest-environment jsdom
/**
 * Unit tests for `AchievementCard` — the port of
 * `@molecule/app-achievement-card-react`'s own suite: the same test names and
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * and the mocked ClassMap / Card the React suite uses.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import AchievementCard from '../AchievementCard.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const icon = (): Snippet => raw('<span data-icon></span>')

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts an {@link AchievementCard} and returns the markup it produced.
 *
 * @param props - The card props.
 * @returns The rendered markup.
 */
function render(props: Record<string, unknown>): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(AchievementCard, {
    target,
    props: { icon: icon(), ...props } as never,
  })
  instances.push(instance)
  flushSync()
  return target.innerHTML
}

describe('AchievementCard', () => {
  it('renders the name inside an <h3>', () => {
    const markup = render({ name: 'First Win' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('First Win')
  })

  it('renders the icon slot', () => {
    const markup = render({ name: 'X' })
    expect(markup).toContain('data-icon')
  })

  it('renders the description and tier when present and omits them otherwise', () => {
    const full = render({ name: 'X', description: 'desc-x', tier: 'Legendary' })
    expect(full).toContain('desc-x')
    expect(full).toContain('Legendary')
    const bare = render({ name: 'X' })
    expect(bare).not.toContain('desc-x')
    expect(bare).not.toContain('Legendary')
  })

  it('shows the earned-at line when earned', () => {
    const markup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(markup).toContain('Earned')
    expect(markup).toContain('Jan 1')
  })

  it('shows a progress bar when not earned and progress is supplied', () => {
    const markup = render({ name: 'X', progress: { value: 3, max: 4 } })
    expect(markup).toContain('width: 75%')
    expect(markup).not.toContain('Locked')
  })

  it('shows "Locked" when not earned and no progress is supplied', () => {
    const markup = render({ name: 'X' })
    expect(markup).toContain('Locked')
  })

  it('greys out the card via inline style only when not earned', () => {
    const locked = render({ name: 'X' })
    expect(locked).toContain('grayscale')
    const earned = render({ name: 'X', earned: true })
    expect(earned).not.toContain('grayscale')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'X', className: 'ac-cls' })
    expect(markup).toContain('ac-cls')
  })

  it('renders the default "Earned" label via t() defaultValue', () => {
    const markup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(markup).toContain('Earned')
  })

  it('lets earnedLabel / lockedLabel props override the status labels (prop wins)', () => {
    const earnedMarkup = render({
      name: 'X',
      earned: true,
      earnedAt: 'Jan 1',
      earnedLabel: 'Unlocked',
    })
    expect(earnedMarkup).toContain('Unlocked')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = render({ name: 'X', lockedLabel: 'Not yet' })
    expect(lockedMarkup).toContain('Not yet')
    expect(lockedMarkup).not.toContain('Locked')
  })

  it('lets a locale bond override the status labels', () => {
    setProvider(
      createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            'achievementCard.earned': 'Obtenido',
            'achievementCard.locked': 'Bloqueado',
          },
        },
      ]),
    )
    const earnedMarkup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' })
    expect(earnedMarkup).toContain('Obtenido')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = render({ name: 'X' })
    expect(lockedMarkup).toContain('Bloqueado')
    expect(lockedMarkup).not.toContain('Locked')
  })
})
