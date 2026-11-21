// @vitest-environment jsdom
/**
 * i18n tests for the Vue presence indicator — a port of
 * `@molecule/app-presence-indicator-react/src/__tests__/presence-indicator-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Vue suite uses.
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

import { type Component, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

import { PresenceDot } from '../PresenceDot.js'

/** The English values the real provider of the switch test carries. */
const EN = {
  'presenceIndicator.aria.presence': 'Presence: {{status}}',
  'presenceIndicator.status.online': 'online',
  'presenceIndicator.status.away': 'away',
  'presenceIndicator.status.busy': 'busy',
  'presenceIndicator.status.offline': 'offline',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'presenceIndicator.aria.presence': 'Anwesenheit: {{status}}',
  'presenceIndicator.status.online': 'online',
  'presenceIndicator.status.away': 'abwesend',
  'presenceIndicator.status.busy': 'beschäftigt',
  'presenceIndicator.status.offline': 'offline',
}

/** The real `en`/`de` provider, set inside the switch test. */
let locales: I18nProvider

beforeEach(() => {
  // A provider whose `t` marks every string with its key, so a default that
  // bypassed t() would show up as plain English.
  setProvider({
    ...createSimpleI18nProvider('en'),
    t: (key, values) =>
      values?.status === undefined ? `«en:${key}»` : `«en:${key}»⟨${String(values.status)}⟩`,
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Renders one component and returns the markup it produced. */
const render = (
  component: Component,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('PresenceDot i18n', () => {
  it('takes the presence label through t when no ariaLabel is given', () => {
    const markup = render(PresenceDot, { status: 'online' })
    expect(markup).toContain(
      'aria-label="«en:presenceIndicator.aria.presence»⟨«en:presenceIndicator.status.online»⟩"',
    )
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const markup = render(PresenceDot, { status: 'busy', ariaLabel: 'Do not disturb' })
    expect(markup).toContain('aria-label="Do not disturb"')
    expect(markup).not.toContain('«')
  })

  it('renders each status word through its own key', () => {
    for (const status of ['online', 'away', 'busy', 'offline']) {
      const markup = render(PresenceDot, { status })
      expect(markup).toContain(`«en:presenceIndicator.status.${status}»`)
    }
  })

  it('renders the label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(defineComponent({ render: () => h(PresenceDot, { status: 'away' }) }))
    app.mount(host)
    const dot = host.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe('Presence: away')

    // The switch itself: the label must re-render in German. Against the old
    // template literal this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    await nextTick()
    expect(dot?.getAttribute('aria-label')).toBe('Anwesenheit: abwesend')

    app.unmount()
    host.remove()
  })
})
