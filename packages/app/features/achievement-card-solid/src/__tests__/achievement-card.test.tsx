// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AchievementCard` — a port of
 * `@molecule/app-achievement-card-react/src/__tests__/achievement-card.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with
 * Solid's browser renderer and asserted on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className and style it received.
vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: JSX.Element; className?: string; style?: unknown }) => (
    <div data-card="" class={props.className} style={props.style}>
      {props.children}
    </div>
  ),
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { AchievementCard } = await import('../AchievementCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const icon = () => <span data-icon="" />

describe('AchievementCard', () => {
  it('renders the name inside an <h3>', () => {
    const markup = mount(() => <AchievementCard name="First Win" icon={icon()} />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('First Win')
  })

  it('renders the icon slot', () => {
    const markup = mount(() => <AchievementCard name="X" icon={icon()} />).innerHTML
    expect(markup).toContain('data-icon=""')
  })

  it('renders the description and tier when present and omits them otherwise', () => {
    const full = mount(() => (
      <AchievementCard name="X" icon={icon()} description="desc-x" tier="Legendary" />
    )).innerHTML
    expect(full).toContain('desc-x')
    expect(full).toContain('Legendary')
    const bare = mount(() => <AchievementCard name="X" icon={icon()} />).innerHTML
    expect(bare).not.toContain('desc-x')
    expect(bare).not.toContain('Legendary')
  })

  it('shows the earned-at line when earned', () => {
    const markup = mount(() => (
      <AchievementCard name="X" icon={icon()} earned earnedAt="Jan 1" />
    )).innerHTML
    expect(markup).toContain('Earned')
    expect(markup).toContain('Jan 1')
  })

  it('shows a progress bar when not earned and progress is supplied', () => {
    const markup = mount(() => (
      <AchievementCard name="X" icon={icon()} progress={{ value: 3, max: 4 }} />
    )).innerHTML
    expect(markup).toContain('width: 75%')
    expect(markup).not.toContain('Locked')
  })

  it('shows "Locked" when not earned and no progress is supplied', () => {
    const markup = mount(() => <AchievementCard name="X" icon={icon()} />).innerHTML
    expect(markup).toContain('Locked')
  })

  it('greys out the card via inline style only when not earned', () => {
    const locked = mount(() => <AchievementCard name="X" icon={icon()} />).innerHTML
    expect(locked).toContain('grayscale')
    const earned = mount(() => <AchievementCard name="X" icon={icon()} earned />).innerHTML
    expect(earned).not.toContain('grayscale')
  })

  it('forwards className onto the Card', () => {
    const markup = mount(() => (
      <AchievementCard name="X" icon={icon()} className="ac-cls" />
    )).innerHTML
    expect(markup).toContain('ac-cls')
  })

  it('renders the default "Earned" label via t() defaultValue', () => {
    const markup = mount(() => (
      <AchievementCard name="X" icon={icon()} earned earnedAt="Jan 1" />
    )).innerHTML
    expect(markup).toContain('Earned')
  })

  it('lets earnedLabel / lockedLabel props override the status labels (prop wins)', () => {
    const earnedMarkup = mount(() => (
      <AchievementCard name="X" icon={icon()} earned earnedAt="Jan 1" earnedLabel="Unlocked" />
    )).innerHTML
    expect(earnedMarkup).toContain('Unlocked')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = mount(() => (
      <AchievementCard name="X" icon={icon()} lockedLabel="Not yet" />
    )).innerHTML
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
    const earnedMarkup = mount(() => (
      <AchievementCard name="X" icon={icon()} earned earnedAt="Jan 1" />
    )).innerHTML
    expect(earnedMarkup).toContain('Obtenido')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = mount(() => <AchievementCard name="X" icon={icon()} />).innerHTML
    expect(lockedMarkup).toContain('Bloqueado')
    expect(lockedMarkup).not.toContain('Locked')
  })
})
