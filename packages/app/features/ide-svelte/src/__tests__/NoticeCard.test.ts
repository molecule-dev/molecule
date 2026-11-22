// @vitest-environment jsdom
/**
 * The shared notice treatment: one card structure for every tone, the
 * design-system action row, and the composable body's segment kinds.
 *
 * Port of `@molecule/app-ide-react`'s `NoticeCard` (the React component's own
 * behaviour is the contract): the card is ONE root element carrying the shared
 * chrome, the accent icon and the body; an action is a real design-system
 * button (`cm.button` + `touchTargetCompact`), a same-origin route stays
 * same-tab, an `http(s)`/protocol-relative target opens a new tab with
 * `noopener noreferrer`, and an unapproved scheme renders inert text. A
 * card-body segment (React's `renderCardSegment`) always opens an allowed link
 * in a new tab, because it is inline prose inside a sentence.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { type IconSet, setIconSet } from '@molecule/app-icons'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import NoticeCard from '../parts/NoticeCard.svelte'
import ResourceLimitBanner from '../parts/ResourceLimitBanner.svelte'
import type { NoticeCardProps } from '../types.js'

/** Every glyph a notice tone in these tests resolves. */
const ICONS: IconSet = {
  'info-circle': { paths: [] },
  lightbulb: { paths: [] },
  clock: { paths: [] },
  'check-circle': { paths: [] },
  'sign-in': { paths: [] },
}

/** The mount alive right now, if any. */
const mounted: { instance?: ReturnType<typeof mount> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(ICONS)
})

afterEach(() => {
  if (mounted.instance) unmount(mounted.instance)
  mounted.instance = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders one component into a fresh container.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The container the component mounted into.
 */
function render(component: typeof NoticeCard, props: Partial<NoticeCardProps>): HTMLElement {
  if (mounted.instance) unmount(mounted.instance)
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const full = { tone: 'info', ...props } as NoticeCardProps
  mounted.instance = mount(component, { target: container, props: full })
  flushSync()
  return container
}

describe('NoticeCard', () => {
  it('renders one root card with the shared chrome, the tone and the accent icon', () => {
    const container = render(NoticeCard, { tone: 'info', text: 'Hello' })
    const card = container.querySelector('[data-mol-id="chat-notice-card"]') as HTMLElement

    expect(card).not.toBeNull()
    expect(card.getAttribute('data-tone')).toBe('info')
    // Exactly ONE root: the chrome sits on the card itself, not on a wrapper.
    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild).toBe(card)
    // The shared container chrome (chatCardStyle) + one timeline rhythm.
    expect(card.style.display).toBe('flex')
    expect(card.style.alignItems).toBe('flex-start')
    expect(card.style.gap).toBe('10px')
    expect(card.style.marginBottom).toBe('16px')
    expect(card.style.padding).toBe('10px 12px')
    expect(card.style.borderRadius).toBe('8px')
    expect(card.style.lineHeight).toBe('1.5')
    // The accent icon leads the card at the shared size.
    const icon = card.querySelector('svg') as SVGElement
    expect(icon).not.toBeNull()
    expect(icon.getAttribute('width')).toBe('18')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.style.color).toBe('var(--mol-color-primary, #6366f1)')
    expect(icon.style.flexShrink).toBe('0')
    expect(icon.style.marginTop).toBe('1px')
    // The body column fills the card, exactly as React's style object serializes.
    const body = card.querySelector('span') as HTMLElement
    const bodyColumn = body.parentElement as HTMLElement
    expect(bodyColumn.style.flex).toBe('1 1 0%')
    expect(bodyColumn.style.minWidth).toBe('0px')
    // The body is a plain span for single-line text.
    expect(body.textContent).toBe('Hello')
    expect(body.style.whiteSpace).toBe('')
    expect(card.textContent?.trim()).toBe('Hello')
  })

  it('preserves newlines in a multi-line body', () => {
    const container = render(NoticeCard, { tone: 'gold', text: 'Line a\nLine b' })
    const span = container.querySelector('[data-mol-id="chat-notice-card"] span') as HTMLElement
    expect(span.style.whiteSpace).toBe('pre-wrap')
    expect(span.textContent).toBe('Line a\nLine b')
    // A hex tone reaches the icon in the CSSOM's serialized color form, as React's does.
    const icon = container.querySelector('svg') as SVGElement
    expect(icon.getAttribute('style')).toContain('color: rgb(224, 161, 0)')
  })

  it('renders each action as a design-system button: route, external, inert and click', () => {
    const container = render(NoticeCard, {
      tone: 'upgrade',
      text: 'Out of memory',
      action: [
        { label: 'Upgrade', href: '/pricing' },
        { label: 'Status', href: 'https://status.example.test' },
        { label: 'Proto', href: '//accounts.example.test/login' },
        { label: 'Bad', href: 'javascript:alert(1)' },
        { label: 'Run', onClick: () => {} },
      ],
    })
    const cm = getClassMap()
    const actionClasses = cm
      .cn(cm.button({ color: 'warning', size: 'sm' }), cm.touchTargetCompact)
      .split(/\s+/)
      .filter(Boolean)
    const assertActionClasses = (element: Element): void => {
      for (const token of actionClasses) expect(element.classList.contains(token)).toBe(true)
    }

    const route = container.querySelector('a[href="/pricing"]') as HTMLAnchorElement
    expect(route).not.toBeNull()
    expect(route.getAttribute('target')).toBeNull()
    expect(route.getAttribute('rel')).toBeNull()
    expect(route.style.textDecoration).toBe('none')
    assertActionClasses(route)

    const external = container.querySelector(
      'a[href="https://status.example.test"]',
    ) as HTMLAnchorElement
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')

    const protocolRelative = container.querySelector(
      'a[href="//accounts.example.test/login"]',
    ) as HTMLAnchorElement
    expect(protocolRelative.getAttribute('target')).toBe('_blank')
    expect(protocolRelative.getAttribute('rel')).toBe('noopener noreferrer')

    // An unapproved scheme never becomes an anchor.
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    const inert = Array.from(container.querySelectorAll('span')).find(
      (element) => element.textContent === 'Bad',
    ) as HTMLElement
    expect(inert).toBeDefined()
    assertActionClasses(inert)

    const button = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === 'Run',
    ) as HTMLButtonElement
    expect(button).toBeDefined()
    expect(button.getAttribute('type')).toBe('button')
    assertActionClasses(button)
  })

  it('renders a composable body: text, inline code, new-tab links and inert schemes', () => {
    const container = render(NoticeCard, {
      tone: 'gold',
      content: [
        'See ',
        { code: '/run' },
        ' or ',
        { label: 'the docs', href: '/docs' },
        ' or ',
        { label: 'the site', href: 'https://example.test' },
        ' or ',
        { label: 'unsafe', href: 'data:text/html,x' },
        '.',
      ],
    })
    const card = container.querySelector('[data-mol-id="chat-notice-card"]') as HTMLElement

    // A plain string renders inside its own span (React's `<span>{seg}</span>`).
    const spans = Array.from(card.querySelectorAll('span'))
    expect(spans.some((element) => element.textContent === 'See ')).toBe(true)

    const code = card.querySelector('code') as HTMLElement
    expect(code.textContent).toBe('/run')
    expect(code.style.fontFamily).toBe('var(--mol-font-mono, monospace)')
    expect(code.style.borderRadius).toBe('4px')

    // A card-body segment always opens an allowed link in a new tab — even a
    // same-origin route, because the segment is inline prose.
    const docs = card.querySelector('a[href="/docs"]') as HTMLAnchorElement
    expect(docs.getAttribute('target')).toBe('_blank')
    expect(docs.getAttribute('rel')).toBe('noopener noreferrer')
    expect(docs.style.textDecoration).toBe('underline')

    const site = card.querySelector('a[href="https://example.test"]') as HTMLAnchorElement
    expect(site.getAttribute('target')).toBe('_blank')

    // An unapproved scheme renders as inert text, never an anchor.
    expect(card.querySelector('a[href^="data:"]')).toBeNull()
    expect(spans.some((element) => element.textContent === 'unsafe')).toBe(true)
  })

  it('renders a clickable inline action as a link-styled button', () => {
    let clicked = 0
    const container = render(NoticeCard, {
      tone: 'success',
      content: [{ label: 'Run tests', onClick: () => (clicked += 1) }],
    })
    const button = container.querySelector('button') as HTMLButtonElement
    expect(button).not.toBeNull()
    expect(button.getAttribute('type')).toBe('button')
    // React's inline-card-link reset: no box, inherited font.
    expect(button.getAttribute('style')).toContain('background: none')
    // `border: none` reads back as the shorthand's reset style under the CSSOM.
    expect(button.style.borderStyle).toBe('none')
    expect(button.style.padding).toBe('0px')
    expect(button.style.font).toBe('inherit')
    expect(button.style.cursor).toBe('pointer')
    button.click()
    expect(clicked).toBe(1)
  })

  it('suppresses the action row when a content array is present, even when empty', () => {
    const container = render(NoticeCard, {
      tone: 'info',
      text: 'Fallback',
      content: [],
      action: { label: 'Learn more', href: '/docs' },
    })
    expect(container.querySelector('a[href="/docs"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-notice-card"]')?.textContent?.trim()).toBe(
      '',
    )
  })

  it('renders the resource-limit banner through the upgrade tone', () => {
    if (mounted.instance) unmount(mounted.instance)
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.instance = mount(ResourceLimitBanner, {
      target: container,
      props: {
        message: 'Your sandbox ran out of memory.',
        action: { label: 'Upgrade', href: '/pricing' },
      },
    })
    flushSync()

    const card = container.querySelector('[data-mol-id="chat-notice-card"]') as HTMLElement
    expect(card.getAttribute('data-tone')).toBe('upgrade')
    expect(card.textContent).toContain('Your sandbox ran out of memory.')
    expect(card.querySelector('a[href="/pricing"]')).not.toBeNull()
  })
})
