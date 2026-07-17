import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    style,
  }: {
    children?: ReactNode
    className?: string
    style?: Record<string, unknown>
  }) => createElement('div', { 'data-card': '', className, style }, children),
}))

const { AchievementCard } = await import('../AchievementCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)
const icon = createElement('span', { 'data-icon': '' })

afterEach(() => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AchievementCard', () => {
  it('renders the name inside an <h3>', () => {
    const markup = html(createElement(AchievementCard, { name: 'First Win', icon }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('First Win')
  })

  it('renders the icon slot', () => {
    const markup = html(createElement(AchievementCard, { name: 'X', icon }))
    expect(markup).toContain('data-icon=""')
  })

  it('renders the description and tier when present and omits them otherwise', () => {
    const full = html(
      createElement(AchievementCard, { name: 'X', icon, description: 'desc-x', tier: 'Legendary' }),
    )
    expect(full).toContain('desc-x')
    expect(full).toContain('Legendary')
    const bare = html(createElement(AchievementCard, { name: 'X', icon }))
    expect(bare).not.toContain('desc-x')
    expect(bare).not.toContain('Legendary')
  })

  it('shows the earned-at line when earned', () => {
    const markup = html(
      createElement(AchievementCard, { name: 'X', icon, earned: true, earnedAt: 'Jan 1' }),
    )
    expect(markup).toContain('Earned')
    expect(markup).toContain('Jan 1')
  })

  it('shows a progress bar when not earned and progress is supplied', () => {
    const markup = html(
      createElement(AchievementCard, { name: 'X', icon, progress: { value: 3, max: 4 } }),
    )
    expect(markup).toContain('width:75%')
    expect(markup).not.toContain('Locked')
  })

  it('shows "Locked" when not earned and no progress is supplied', () => {
    const markup = html(createElement(AchievementCard, { name: 'X', icon }))
    expect(markup).toContain('Locked')
  })

  it('greys out the card via inline style only when not earned', () => {
    const locked = html(createElement(AchievementCard, { name: 'X', icon }))
    expect(locked).toContain('grayscale')
    const earned = html(createElement(AchievementCard, { name: 'X', icon, earned: true }))
    expect(earned).not.toContain('grayscale')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(AchievementCard, { name: 'X', icon, className: 'ac-cls' }))
    expect(markup).toContain('ac-cls')
  })

  it('renders the default "Earned" label via t() defaultValue', () => {
    const markup = html(
      createElement(AchievementCard, { name: 'X', icon, earned: true, earnedAt: 'Jan 1' }),
    )
    expect(markup).toContain('Earned')
  })

  it('lets earnedLabel / lockedLabel props override the status labels (prop wins)', () => {
    const earnedMarkup = html(
      createElement(AchievementCard, {
        name: 'X',
        icon,
        earned: true,
        earnedAt: 'Jan 1',
        earnedLabel: 'Unlocked',
      }),
    )
    expect(earnedMarkup).toContain('Unlocked')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = html(
      createElement(AchievementCard, { name: 'X', icon, lockedLabel: 'Not yet' }),
    )
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
    const earnedMarkup = html(
      createElement(AchievementCard, { name: 'X', icon, earned: true, earnedAt: 'Jan 1' }),
    )
    expect(earnedMarkup).toContain('Obtenido')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = html(createElement(AchievementCard, { name: 'X', icon }))
    expect(lockedMarkup).toContain('Bloqueado')
    expect(lockedMarkup).not.toContain('Locked')
  })
})
