import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)
const icon = createElement('span', { 'data-icon': '' })

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
})
