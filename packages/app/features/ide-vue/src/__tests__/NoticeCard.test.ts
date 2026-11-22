// @vitest-environment jsdom
/**
 * The shared notice card's React contract: ONE root element carrying React's
 * inline chrome and `data-mol-id`/`data-tone`, the tone icon and body as its only
 * children, a plain body wrapped in a span (pre-wrapped only when multi-line),
 * composable body segments rendered in order with React's inline code/link
 * styles, and design-system action buttons that never become anchors for an
 * unapproved scheme. `ResourceLimitBanner` is the upgrade tone of the same card.
 *
 * The card is a part of `@molecule/app-ide-react`'s ChatPanel; these assertions
 * restate the DOM that component renders, so a structure drift (an extra
 * wrapper, a missing span, an inline style the ClassMap owns) is caught here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { setIconSet } from '@molecule/app-icons'
import {
  CHAT_CARD_CODE_STYLE,
  CHAT_CARD_ICON_SIZE,
  CHAT_CARD_LINK_STYLE,
  NOTICE_TONE,
  TIMELINE_ITEM_GAP,
} from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NoticeCard, ResourceLimitBanner } from '../parts/NoticeCard.js'

/** The root this file last mounted. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual design-system classes.
  setClassMap(classMap)
  // A bonded icon set, so the tone <Icon> resolves to a real <svg>.
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({ paths: [{ d: `glyph:${String(name)}` }], viewBox: '0 0 16 16' }),
      },
    ),
  )
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Mounts one component and returns the host element.
 *
 * @param render - The render function of the wrapper component.
 * @returns The host element the component mounted into.
 */
function mount(render: () => VNodeChild): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render }))
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * Splits an element's class list into tokens.
 *
 * @param el - The element to read.
 * @returns Its class tokens.
 */
function classesOf(el: Element): string[] {
  return Array.from(el.classList)
}

/**
 * A CSS value as the DOM serializes it (jsdom normalizes `rgba(…)` spacing).
 *
 * @param value - The value as the shared constant writes it.
 * @returns The value the browser's style declaration reports.
 */
function cssValue(value: string): string {
  return value.replace(/,\s*/g, ', ')
}

describe('NoticeCard — the shared tone-accented notice treatment', () => {
  it('renders ONE root with React’s inline chrome and the tone icon', () => {
    const host = mount(() => h(NoticeCard, { tone: 'upgrade', text: 'Out of memory.' }))
    const card = host.firstElementChild as HTMLElement
    const cm = getClassMap()
    const accent = NOTICE_TONE.upgrade.accent

    expect(card.getAttribute('data-mol-id')).toBe('chat-notice-card')
    expect(card.getAttribute('data-tone')).toBe('upgrade')
    expect(classesOf(card)).toEqual(cm.textSize('xs').split(/\s+/))
    // React's style: layout + the shared card chrome, all on the ONE root.
    expect(card.style.display).toBe('flex')
    expect(card.style.alignItems).toBe('flex-start')
    expect(card.style.gap).toBe('10px')
    expect(card.style.marginBottom).toBe(`${TIMELINE_ITEM_GAP}px`)
    expect(card.style.padding).toBe('10px 12px')
    expect(card.style.borderRadius).toBe('8px')
    expect(card.style.lineHeight).toBe('1.5')
    expect(card.style.border).toContain('color-mix')
    expect(card.style.border).toContain(accent)
    expect(card.style.background).toContain('color-mix')
    // The tone icon and the body, and nothing between them (no wrapper element).
    expect(Array.from(card.children).map((el) => el.tagName)).toEqual(['svg', 'DIV'])
    const icon = card.firstElementChild as SVGElement
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.getAttribute('width')).toBe(String(CHAT_CARD_ICON_SIZE))
    expect(icon.style.flexShrink).toBe('0')
    expect(icon.style.marginTop).toBe('1px')
  })

  it('wraps the plain body in a span, pre-wrapping only multi-line text', () => {
    const single = mount(() => h(NoticeCard, { tone: 'info', text: 'One line.' }))
    const singleBody = single.firstElementChild?.lastElementChild as HTMLElement
    expect(singleBody.children).toHaveLength(1)
    expect(singleBody.firstElementChild?.tagName).toBe('SPAN')
    expect((singleBody.firstElementChild as HTMLElement).style.whiteSpace).toBe('')
    expect(singleBody.textContent).toBe('One line.')

    mounted.app?.unmount()
    const multi = mount(() => h(NoticeCard, { tone: 'info', text: 'One line.\nTwo lines.' }))
    const multiBody = multi.firstElementChild?.lastElementChild as HTMLElement
    expect((multiBody.firstElementChild as HTMLElement).style.whiteSpace).toBe('pre-wrap')
  })

  it('renders a composable body segment by segment and skips the action row', () => {
    const onRun = vi.fn()
    const host = mount(() =>
      h(NoticeCard, {
        tone: 'gold',
        content: [
          'Use ',
          { code: '/help' },
          ' then ',
          { label: 'docs', href: 'https://example.test/docs' },
          { label: 'run it', onClick: onRun },
          { label: 'inert', href: 'javascript:alert(1)' },
        ],
        // A content card renders its body INSTEAD of the action row.
        action: [{ label: 'Ignored', href: '/ignored' }],
      }),
    )
    const body = host.firstElementChild?.lastElementChild as HTMLElement
    const children = Array.from(body.children) as HTMLElement[]

    expect(children.map((el) => el.tagName)).toEqual([
      'SPAN',
      'CODE',
      'SPAN',
      'A',
      'BUTTON',
      'SPAN',
    ])
    expect(children[0].textContent).toBe('Use ')
    // The code segment keeps the shared chip style.
    expect(children[1].style.fontFamily).toBe(CHAT_CARD_CODE_STYLE.fontFamily)
    expect(children[1].style.borderRadius).toBe(`${CHAT_CARD_CODE_STYLE.borderRadius}px`)
    expect(children[1].style.background).toBe(cssValue(CHAT_CARD_CODE_STYLE.background))
    expect(children[1].textContent).toBe('/help')
    // Every href segment opens in a new tab, even an app route (React's segment rule).
    expect(children[3].getAttribute('href')).toBe('https://example.test/docs')
    expect(children[3].getAttribute('target')).toBe('_blank')
    expect(children[3].getAttribute('rel')).toBe('noopener noreferrer')
    expect(children[3].style.color).toBe(CHAT_CARD_LINK_STYLE.color)
    expect(children[3].style.textDecoration).toBe(CHAT_CARD_LINK_STYLE.textDecoration)
    // A clickable segment without an href is a plain-link button.
    expect(children[4].getAttribute('type')).toBe('button')
    expect(children[4].style.background).toBe('none')
    // jsdom reports the `border: none` shorthand through its longhand.
    expect(children[4].style.borderStyle).toBe('none')
    expect(children[4].style.padding).toBe('0px')
    children[4].click()
    expect(onRun).toHaveBeenCalledTimes(1)
    // An unapproved scheme never becomes an anchor — inert text with the link style.
    expect(children[5].getAttribute('href')).toBeNull()
    expect(children[5].style.color).toBe(CHAT_CARD_LINK_STYLE.color)
    expect(children[5].textContent).toBe('inert')
    expect(body.querySelector('a[href^="javascript:"]')).toBeNull()
    // No action row was appended after the content.
    expect(body.children).toHaveLength(6)
    expect(host.textContent).not.toContain('Ignored')
  })

  it('renders a clickable CODE segment as a monospace chip link', () => {
    const host = mount(() =>
      h(NoticeCard, {
        tone: 'info',
        content: [{ label: '/report', code: true, onClick: () => {} }],
      }),
    )
    const button = (host.firstElementChild?.lastElementChild as HTMLElement)
      .firstElementChild as HTMLElement
    expect(button.tagName).toBe('BUTTON')
    expect(button.style.fontFamily).toBe(CHAT_CARD_CODE_STYLE.fontFamily)
    expect(button.style.background).toBe(cssValue(CHAT_CARD_CODE_STYLE.background))
    expect(button.style.border).toBe(cssValue(CHAT_CARD_CODE_STYLE.border))
    expect(button.style.borderRadius).toBe(`${CHAT_CARD_CODE_STYLE.borderRadius}px`)
    // A code action is a link, not underlined prose.
    expect(button.style.textDecoration).toBe('')
    expect(button.style.cursor).toBe('pointer')
  })

  it('renders every action as the design-system button the card uses for its tone', () => {
    const host = mount(() =>
      h(NoticeCard, {
        tone: 'upgrade',
        text: 'Limit reached.',
        action: [
          { label: 'Upgrade', href: '/pricing' },
          { label: 'Source', href: 'https://example.test/repo' },
          { label: 'Re-auth', href: '//accounts.example.test/login' },
          { label: 'Inert', href: 'data:text/html,x' },
          { label: 'Run', onClick: () => {} },
        ],
      }),
    )
    const card = host.firstElementChild as HTMLElement
    const cm = getClassMap()
    const expected = cm
      .cn(cm.button({ color: 'warning', size: 'sm' }), cm.touchTargetCompact)
      .split(/\s+/)
    const row = card.lastElementChild?.lastElementChild as HTMLElement
    const actions = Array.from(row.children) as HTMLElement[]

    expect(actions.map((el) => el.tagName)).toEqual(['A', 'A', 'A', 'SPAN', 'BUTTON'])
    for (const el of actions) {
      for (const token of expected) expect(el.classList.contains(token)).toBe(true)
      expect(el.style.textDecoration).toBe('none')
      expect(el.style.fontFamily).toBe('inherit')
      // The ClassMap owns the box model — nothing the design system owns is inline.
      expect(el.style.background).toBe('')
      expect(el.style.borderRadius).toBe('')
      expect(el.style.fontSize).toBe('')
    }
    // An app route stays same-tab; an http(s) or protocol-relative href opens externally.
    expect(actions[0].getAttribute('target')).toBeNull()
    expect(actions[0].getAttribute('rel')).toBeNull()
    for (const external of [actions[1], actions[2]]) {
      expect(external.getAttribute('target')).toBe('_blank')
      expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    }
    expect(actions[3].getAttribute('href')).toBeNull()
    expect(actions[4].getAttribute('type')).toBe('button')
  })

  it('takes an explicit action colour over the tone default', () => {
    const host = mount(() =>
      h(NoticeCard, {
        tone: 'upgrade',
        text: 'Limit reached.',
        action: [{ label: 'Sign up', href: '/signup', color: 'primary' }],
      }),
    )
    const cm = getClassMap()
    const link = (host.firstElementChild?.lastElementChild as HTMLElement).querySelector(
      'a',
    ) as HTMLElement
    const expected = cm
      .cn(cm.button({ color: 'primary', size: 'sm' }), cm.touchTargetCompact)
      .split(/\s+/)
    for (const token of expected) expect(link.classList.contains(token)).toBe(true)
  })

  it('ResourceLimitBanner renders the upgrade tone of the same notice card', () => {
    const host = mount(() =>
      h(ResourceLimitBanner, {
        message: 'Sandbox ran out of memory.',
        action: [{ label: 'Upgrade', href: '/pricing' }],
      }),
    )
    const card = host.firstElementChild as HTMLElement
    expect(card.getAttribute('data-mol-id')).toBe('chat-notice-card')
    expect(card.getAttribute('data-tone')).toBe('upgrade')
    expect(card.textContent).toContain('Sandbox ran out of memory.')
    expect(card.textContent).toContain('Upgrade')
  })
})
