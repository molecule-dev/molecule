// @vitest-environment jsdom

/**
 * Card-action href scheme allowlist.
 *
 * A port of `@molecule/app-ide-react`'s `link-href-allowlist` suite's HelpCard
 * titles with the same names and the same assertions: `ChatEventCardAction.href`
 * renders anchors in the HelpCard's upgrade actions through the SAME scheme
 * allowlist as markdown links ({@link isAllowedLinkHref}) — an unapproved scheme
 * (`javascript:`) renders as inert text, never an anchor.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { HelpCardProps } from '../parts/HelpCard.js'
import { HelpCard } from '../parts/HelpCard.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders the help card the way the chat timeline does.
 *
 * @param props - Props to render with.
 * @returns The host element.
 */
function renderHelpCard(
  props: Partial<HelpCardProps> & Pick<HelpCardProps, 'isLight'>,
): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(HelpCard, { ...props }),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * The element whose text is `text`.
 *
 * @param container - The host the card mounted into.
 * @param text - The text to find.
 * @returns The matching element, or null.
 */
function findByText(container: HTMLElement, text: string): Element | null {
  return (
    Array.from(container.querySelectorAll('*')).find(
      (el) => el.childElementCount === 0 && el.textContent === text,
    ) ?? null
  )
}

describe('HelpCard upgrade actions', () => {
  it('renders an https action as an anchor', () => {
    const container = renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'https://molecule.dev/pricing' },
    })
    const label = findByText(container, 'Upgrade plan')
    expect(label, 'the upgrade action must render').not.toBeNull()
    const anchor = label?.closest('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('https://molecule.dev/pricing')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a javascript: action as inert text, never an anchor', () => {
    const container = renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'javascript:alert(1)' },
    })
    const label = findByText(container, 'Upgrade plan')
    expect(label, 'the upgrade action must render').not.toBeNull()
    expect(label?.closest('a')).toBeNull()
  })
})
