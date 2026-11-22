// @vitest-environment jsdom
/**
 * IDE8 — inline Activity card channel-icon quality guard: a port of
 * `@molecule/app-ide-react/src/__tests__/ActivityCard.test.tsx` with the same
 * test names and the same assertions, mounted as a real Solid root.
 *
 * The card must render the SAME themed SVG family as the rest of the IDE,
 * never an emoji string: every glyph resolves to a real `<svg><path
 * d="glyph:NAME">` from a NAME-KEYED icon set, so each test asserts the card
 * leads with the CORRECT channel-specific glyph for EACH type (never one fixed
 * glyph, never an emoji), the glyph follows the surrounding theme token via
 * `currentColor`, and none of the legacy emoji nor the bare `#` survive in the
 * rendered text.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { Activity } from '@molecule/app-ide-panel-logic'
import { ACTIVITY_TYPES, activityIconName } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ActivityCard } from '../components/ActivityCard.jsx'

// The emoji + bare-# glyphs the old map used — none may survive in the DOM.
const LEGACY_GLYPHS = ['\u{1F4E7}', '\u{1F4AC}', '\u{1F514}', '\u{1FA9D}', '#']

/** One captured activity per channel type, in tab order. */
function activityFor(type: Activity['type']): Activity {
  return {
    id: `act-${type}`,
    type,
    status: 'sent',
    recipient: type === 'email' ? 'user@example.com' : undefined,
    summary: `${type} captured`,
    timestamp: '2026-05-24T10:00:00.000Z',
  }
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so we can assert the card renders the
  // CORRECT channel-specific glyph (never one fixed/generic glyph, never emoji).
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the card the way ChatPanel does.
 *
 * @param activity - The activity to render.
 * @returns The mounted host element.
 */
function renderCard(activity: Activity): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(() => <ActivityCard activity={activity} />, container)
  return container
}

describe('ActivityCard channel icons — IDE8', () => {
  it('leads with the channel-specific themed SVG glyph for every type (never an emoji)', () => {
    const seen = new Set<string>()
    for (const type of ACTIVITY_TYPES) {
      const container = renderCard(activityFor(type))
      const svg = container.querySelector('svg')
      expect(svg, `${type} card must render an <svg> icon, not an emoji`).not.toBeNull()
      const d = svg?.querySelector('path')?.getAttribute('d')
      // The glyph wired must be the one activityIconName maps this channel to.
      expect(d, `${type} renders its own channel glyph`).toBe(`glyph:${activityIconName(type)}`)
      seen.add(d as string)
    }
    // A distinct glyph per channel — proves it is not one fixed/generic icon.
    expect(seen.size).toBe(ACTIVITY_TYPES.length)
  })

  it('colors the icon from the theme token via currentColor — no hardcoded hex', () => {
    const container = renderCard(activityFor('email'))
    const svg = container.querySelector('svg')
    // currentColor makes the glyph inherit the card's token-driven color; a hex
    // fill on the icon would fail this.
    expect(svg?.getAttribute('fill')).toBe('currentColor')
  })

  it('renders NONE of the legacy emoji glyphs (📧/💬/🔔/🪝) nor the bare # anywhere', () => {
    for (const type of ACTIVITY_TYPES) {
      const container = renderCard({ ...activityFor(type), summary: 'orders.created' })
      const text = container.textContent ?? ''
      for (const glyph of LEGACY_GLYPHS) {
        expect(text, `${type} card still renders the legacy glyph ${glyph}`).not.toContain(glyph)
      }
    }
  })
})
