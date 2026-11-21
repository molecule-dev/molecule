// @vitest-environment jsdom
/**
 * i18n tests for the Svelte presence indicator — a port of
 * `@molecule/app-presence-indicator-react/src/__tests__/presence-indicator-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount (jsdom).
 * A provider whose `t` marks every string proves a default that bypassed `t()`;
 * a real `en`/`de` provider proves the label follows a locale switch.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

import PresenceDot from '../PresenceDot.svelte'
import type { PresenceDotProps } from '../types.js'

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

/** A mounted component: its host element and the mount's teardown. */
interface Mounted {
  /** The element the Host rendered into. */
  readonly host: HTMLElement
  /** Unmounts the component and removes the host. */
  dispose(): void
}

/**
 * Mounts a `PresenceDot` with the given props, kept until the test disposes it
 * so a locale switch re-renders in place.
 *
 * @param props - The dot props.
 * @returns The mount.
 */
function mountHost(props: PresenceDotProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(PresenceDot, { target: host, props })
  flushSync()
  return {
    host,
    dispose: () => {
      unmount(instance)
      host.remove()
    },
  }
}

/**
 * Mounts a `PresenceDot` and returns its markup (the host's inner HTML).
 *
 * @param props - The dot props.
 * @returns The markup of the mounted component.
 */
function render(props: PresenceDotProps): string {
  const mounted = mountHost(props)
  const markup = mounted.host.innerHTML
  mounted.dispose()
  return markup
}

describe('PresenceDot i18n', () => {
  it('takes the presence label through t when no ariaLabel is given', () => {
    const markup = render({ status: 'online' })
    expect(markup).toContain(
      'aria-label="«en:presenceIndicator.aria.presence»⟨«en:presenceIndicator.status.online»⟩"',
    )
  })

  it('lets an explicit ariaLabel prop override the translated default', () => {
    const markup = render({ status: 'busy', ariaLabel: 'Do not disturb' })
    expect(markup).toContain('aria-label="Do not disturb"')
    expect(markup).not.toContain('«')
  })

  it('renders each status word through its own key', () => {
    for (const status of ['online', 'away', 'busy', 'offline'] as const) {
      const markup = render({ status })
      expect(markup).toContain(`«en:presenceIndicator.status.${status}»`)
    }
  })

  it('renders the label in the locale the provider switches to', () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const mounted = mountHost({ status: 'away' })
    const dot = mounted.host.querySelector('[role="status"]')
    expect(dot?.getAttribute('aria-label')).toBe('Presence: away')

    // The switch itself: the label must re-render in German. Against the old
    // template literal this stayed English — nothing subscribed it.
    void locales.setLocale('de')
    flushSync()
    expect(dot?.getAttribute('aria-label')).toBe('Anwesenheit: abwesend')

    mounted.dispose()
  })
})
