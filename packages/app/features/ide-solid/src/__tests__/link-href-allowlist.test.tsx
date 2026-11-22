// @vitest-environment jsdom

/**
 * Card-action href scheme allowlist.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/link-href-allowlist.test.tsx`
 * with the same test names and the same assertions: `ChatEventCardAction.href`
 * renders anchors in the HelpCard's upgrade actions — the sanctioned extension
 * point for host/model-authored actions — through the SAME scheme allowlist as
 * markdown links ({@link isAllowedLinkHref}). An unapproved scheme
 * (`javascript:`, `data:`, tab-broken `java\tscript:`) renders as inert text,
 * never an anchor.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HelpCard } from '../parts/HelpCard.jsx'
import { isAllowedLinkHref } from '../parts/MarkdownContent.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the help card with the given upgrade action.
 *
 * @param href - The action's href.
 * @returns The mounted container.
 */
function renderUpgrade(href: string): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <HelpCard
        isLight
        upgradeLines={['You have used the free allowance.']}
        upgradeAction={{ label: 'Upgrade plan', href }}
      />
    ),
    container,
  )
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

describe('isAllowedLinkHref (shared scheme gate)', () => {
  it('allows http(s), mailto and scheme-less hrefs', () => {
    expect(isAllowedLinkHref('https://molecule.dev/pricing')).toBe(true)
    expect(isAllowedLinkHref('http://example.test/page')).toBe(true)
    expect(isAllowedLinkHref('mailto:support@molecule.dev')).toBe(true)
    expect(isAllowedLinkHref('/projects/p1')).toBe(true)
    expect(isAllowedLinkHref('//cdn.example.test/lib.js')).toBe(true)
  })

  it('refuses scriptable schemes', () => {
    expect(isAllowedLinkHref('javascript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('JAVASCRIPT:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedLinkHref('vbscript:msgbox(1)')).toBe(false)
  })

  it('refuses schemes smuggled past the parser with tab/newline (browsers strip them)', () => {
    expect(isAllowedLinkHref('java\tscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref('java\nscript:alert(1)')).toBe(false)
    expect(isAllowedLinkHref(' \u0000 javascript:alert(1)')).toBe(false)
  })
})

describe('HelpCard upgrade actions', () => {
  it('renders an https action as an anchor', () => {
    renderUpgrade('https://molecule.dev/pricing')
    const anchor = getByText('Upgrade plan').closest('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('https://molecule.dev/pricing')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a javascript: action as inert text, never an anchor', () => {
    renderUpgrade('javascript:alert(1)')
    const label = getByText('Upgrade plan')
    expect(label.closest('a')).toBeNull()
  })
})
