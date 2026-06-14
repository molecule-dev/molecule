// @vitest-environment jsdom

/**
 * IDE8 — inline Activity card channel-icon quality guard (emoji → themed SVG).
 *
 * The MVP intent audit (`docs/mvp-intent-findings.md`, IDE8) found the Activity
 * surface the user explicitly liked rendered raw EMOJI (📧/💬/🔔/🪝) — and a bare
 * `#` for channels — for its channel icons, while the rest of the IDE uses the
 * bonded SVG icon set. The molecule-dev ActivityPanel fix moved the panel onto
 * themed `<Icon>` glyphs; this is the shared-card half: {@link ActivityCard} (the
 * compact card streamed into the chat timeline) must render the SAME themed SVG
 * family, never an emoji string.
 *
 * A pure-function test can't prove the rendered DOM stopped using emoji, so this
 * is a real jsdom render of the card driven by a NAME-KEYED icon set: every glyph
 * resolves to a real `<svg><path d="glyph:NAME">`, so we can assert the card leads
 * with the CORRECT channel-specific glyph for EACH type (never one fixed glyph,
 * never an emoji), the glyph follows the surrounding theme token via
 * `currentColor` (no hardcoded hex on the icon), and none of the legacy emoji nor
 * the bare `#` survive in the rendered text. A revert to the old `activityIcon()`
 * emoji map fails here.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { Activity } from '../components/activity-utilities.js'
import { ACTIVITY_TYPES, activityIconName } from '../components/activity-utilities.js'
import { ActivityCard } from '../components/ActivityCard.js'

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

/**
 * Wrap children with the i18n context the card's `t()` calls need.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual theme tokens.
  setClassMap(classMap)
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
  cleanup()
})

describe('ActivityCard channel icons — IDE8', () => {
  it('leads with the channel-specific themed SVG glyph for every type (never an emoji)', () => {
    const seen = new Set<string>()
    for (const type of ACTIVITY_TYPES) {
      const { container, unmount } = render(
        <Wrap>
          <ActivityCard activity={activityFor(type)} />
        </Wrap>,
      )
      const svg = container.querySelector('svg')
      expect(svg, `${type} card must render an <svg> icon, not an emoji`).not.toBeNull()
      const d = svg?.querySelector('path')?.getAttribute('d')
      // The glyph wired must be the one activityIconName maps this channel to.
      expect(d, `${type} renders its own channel glyph`).toBe(`glyph:${activityIconName(type)}`)
      seen.add(d as string)
      unmount()
    }
    // A distinct glyph per channel — proves it is not one fixed/generic icon.
    expect(seen.size).toBe(ACTIVITY_TYPES.length)
  })

  it('colors the icon from the theme token via currentColor — no hardcoded hex', () => {
    const { container } = render(
      <Wrap>
        <ActivityCard activity={activityFor('email')} />
      </Wrap>,
    )
    const svg = container.querySelector('svg')
    // currentColor makes the glyph inherit the card's token-driven color; a hex
    // fill on the icon would fail this.
    expect(svg?.getAttribute('fill')).toBe('currentColor')
  })

  it('renders NONE of the legacy emoji glyphs (📧/💬/🔔/🪝) nor the bare # anywhere', () => {
    for (const type of ACTIVITY_TYPES) {
      const { container, unmount } = render(
        <Wrap>
          <ActivityCard activity={{ ...activityFor(type), summary: 'orders.created' }} />
        </Wrap>,
      )
      const text = container.textContent ?? ''
      for (const glyph of LEGACY_GLYPHS) {
        expect(text, `${type} card still renders the legacy glyph ${glyph}`).not.toContain(glyph)
      }
      unmount()
    }
  })
})
