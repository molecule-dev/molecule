// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AchievementCard` — a port of
 * `@molecule/app-achievement-card-react/src/__tests__/achievement-card.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className and style it received.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Card: defineComponent({
      name: 'Card',
      props: { className: String, style: [String, Object] },
      setup(props, { slots }) {
        return () =>
          h(
            'div',
            { 'data-card': '', class: props.className, style: props.style },
            slots.default?.(),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AchievementCard } from '../AchievementCard.js'

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders an {@link AchievementCard} and returns the markup it produced.
 *
 * @param props - The card props.
 * @param slots - Node-valued props, passed as same-named slots.
 * @returns The rendered markup.
 */
const render = (
  props: Record<string, unknown>,
  slots: Record<string, () => VNodeChild[]> = {},
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AchievementCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const iconSlot = { icon: () => [h('span', { 'data-icon': '' })] }

describe('AchievementCard', () => {
  it('renders the name inside an <h3>', () => {
    const markup = render({ name: 'First Win' }, iconSlot)
    expect(markup).toContain('<h3')
    expect(markup).toContain('First Win')
  })

  it('renders the icon slot', () => {
    const markup = render({ name: 'X' }, iconSlot)
    expect(markup).toContain('data-icon=""')
  })

  it('renders the description and tier when present and omits them otherwise', () => {
    const full = render({ name: 'X', description: 'desc-x', tier: 'Legendary' }, iconSlot)
    expect(full).toContain('desc-x')
    expect(full).toContain('Legendary')
    const bare = render({ name: 'X' }, iconSlot)
    expect(bare).not.toContain('desc-x')
    expect(bare).not.toContain('Legendary')
  })

  it('shows the earned-at line when earned', () => {
    const markup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' }, iconSlot)
    expect(markup).toContain('Earned')
    expect(markup).toContain('Jan 1')
  })

  it('shows a progress bar when not earned and progress is supplied', () => {
    const markup = render({ name: 'X', progress: { value: 3, max: 4 } }, iconSlot)
    expect(markup).toContain('width: 75%')
    expect(markup).not.toContain('Locked')
  })

  it('shows "Locked" when not earned and no progress is supplied', () => {
    const markup = render({ name: 'X' }, iconSlot)
    expect(markup).toContain('Locked')
  })

  it('greys out the card via inline style only when not earned', () => {
    const locked = render({ name: 'X' }, iconSlot)
    expect(locked).toContain('grayscale')
    const earned = render({ name: 'X', earned: true }, iconSlot)
    expect(earned).not.toContain('grayscale')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'X', className: 'ac-cls' }, iconSlot)
    expect(markup).toContain('ac-cls')
  })

  it('renders the default "Earned" label via t() defaultValue', () => {
    const markup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' }, iconSlot)
    expect(markup).toContain('Earned')
  })

  it('lets earnedLabel / lockedLabel props override the status labels (prop wins)', () => {
    const earnedMarkup = render(
      { name: 'X', earned: true, earnedAt: 'Jan 1', earnedLabel: 'Unlocked' },
      iconSlot,
    )
    expect(earnedMarkup).toContain('Unlocked')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = render({ name: 'X', lockedLabel: 'Not yet' }, iconSlot)
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
    const earnedMarkup = render({ name: 'X', earned: true, earnedAt: 'Jan 1' }, iconSlot)
    expect(earnedMarkup).toContain('Obtenido')
    expect(earnedMarkup).not.toContain('Earned')

    const lockedMarkup = render({ name: 'X' }, iconSlot)
    expect(lockedMarkup).toContain('Bloqueado')
    expect(lockedMarkup).not.toContain('Locked')
  })
})
