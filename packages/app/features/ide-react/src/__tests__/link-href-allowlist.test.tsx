// @vitest-environment jsdom

/**
 * Card-action href scheme allowlist.
 *
 * `ChatEventCardAction.href` renders anchors in the ChatPanel card bodies and
 * the HelpCard's upgrade actions — the sanctioned extension point for
 * host/model-authored actions. Those anchors go through the SAME scheme
 * allowlist as markdown links ({@link isAllowedLinkHref}): an unapproved scheme
 * (`javascript:`, `data:`, tab-broken `java\tscript:`) renders as inert text,
 * never an anchor.
 *
 * @module
 */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HelpCard } from '../components/HelpCard.js'
import { isAllowedLinkHref } from '../components/MarkdownContent.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

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
    render(
      <HelpCard
        isLight
        upgradeLines={['You have used the free allowance.']}
        upgradeAction={{ label: 'Upgrade plan', href: 'https://molecule.dev/pricing' }}
      />,
    )
    const anchor = screen.getByText('Upgrade plan').closest('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('https://molecule.dev/pricing')
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a javascript: action as inert text, never an anchor', () => {
    render(
      <HelpCard
        isLight
        upgradeLines={['You have used the free allowance.']}
        upgradeAction={{ label: 'Upgrade plan', href: 'javascript:alert(1)' }}
      />,
    )
    const label = screen.getByText('Upgrade plan')
    expect(label.closest('a')).toBeNull()
  })
})
