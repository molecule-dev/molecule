// @vitest-environment jsdom

/**
 * Card-action href scheme allowlist.
 *
 * `ChatEventCardAction.href` renders anchors in the ChatPanel card bodies and
 * the HelpCard's upgrade actions — the sanctioned extension point for
 * host/model-authored actions. Those anchors go through the SAME scheme
 * allowlist as markdown links (`isAllowedLinkHref`): an unapproved scheme
 * (`javascript:`, `data:`, tab-broken `java\tscript:`) renders as inert text,
 * never an anchor.
 *
 * A port of the `HelpCard upgrade actions` block of
 * `@molecule/app-ide-react/src/__tests__/link-href-allowlist.test.tsx` with the
 * same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`. (`isAllowedLinkHref` itself is already covered by
 * `MarkdownContent.test.ts`.)
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import HelpCard from '../parts/HelpCard.svelte'
import type { HelpCardProps } from '../types.js'

/** The mounts alive right now, torn down before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
 * Renders the help card with the given props.
 *
 * @param props - Props to render with.
 * @returns The host element.
 */
function renderHelpCard(props: HelpCardProps): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(HelpCard, { target: container, props }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

/**
 * Finds the deepest element whose whole text is the given text (React's
 * `getByText`).
 *
 * @param text - The text to find.
 * @returns The element.
 */
function getByText(text: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
    (element) => element.textContent === text,
  )
  const deepest = matches.filter((element) =>
    matches.every((other) => other === element || !element.contains(other)),
  )
  const found = deepest[0]
  if (!found) throw new Error(`no element with text: ${text}`)
  return found
}

describe('HelpCard upgrade actions', () => {
  it('renders an https action as an anchor', () => {
    renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'https://molecule.dev/pricing' },
    })
    const anchor = getByText('Upgrade plan').closest('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('https://molecule.dev/pricing')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a javascript: action as inert text, never an anchor', () => {
    renderHelpCard({
      isLight: true,
      upgradeLines: ['You have used the free allowance.'],
      upgradeAction: { label: 'Upgrade plan', href: 'javascript:alert(1)' },
    })
    const label = getByText('Upgrade plan')
    expect(label.closest('a')).toBeNull()
  })
})
