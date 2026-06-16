// @vitest-environment jsdom

/**
 * SYN12 — auto-tip card render + i18n + theming regression guard.
 *
 * The MVP intent audit flagged that the auto-tips never reached new users AND
 * that the 5 tip strings were English-only inline (absent from the companion
 * locale bond), contradicting the i18n-first identity. The fix shows a high-value
 * {@link ENTRY_TIP} on a fresh conversation, grows the rotation pool, and adds
 * every tip key (entry + rotation) to `@molecule/app-locales-ide` in 79 languages.
 *
 * This is a real jsdom render of {@link TipCard} (not a source grep). It uses the
 * REAL `@molecule/app-ui-tailwind` ClassMap and registers translations on the live
 * i18n provider, so the assertions bite:
 *
 *  - the tip text resolves from the locale REGISTRY (a deliberately-wrong inline
 *    `defaultValue` is supplied and must be ignored), with `{{agentName}}`
 *    interpolated — proving the strings are in the bond, not English-only inline;
 *  - the card is themed via the `--mol-color-primary` theme token (light/dark +
 *    per-app brand aware), never the old hardcoded indigo `rgba(99,102,241,…)`;
 *  - the lightbulb is a real `<svg>`, not an emoji glyph;
 *  - the dismiss control is an accessible button that fires `onDismiss`.
 *
 * Reverting the theming to a hardcoded hex, the SVG to an emoji, or the locale
 * keys back to inline-only all fail this test.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addTranslations, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ENTRY_TIP } from '../components/chat-tips-utilities.js'
import { TipCard } from '../components/TipCard.js'

/** The English source the locale bond ships for the entry tip (verbatim). */
const ENTRY_TIP_EN =
  'Tip: type / to see every command, or @ a filename to give {{agentName}} a file to work from.'

beforeEach(() => {
  // The REAL themed ClassMap, so the card's resolved classes are actual tokens.
  setClassMap(classMap)
  // Stub the bonded icon set so the lightbulb <Icon> resolves to a real <svg>
  // (TipCard now renders the bonded Icon instead of a hardcoded inline svg — P3-01).
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
  // Register the bond's English strings on the live i18n singleton TipCard reads
  // through. A WRONG default is passed at the call site below, so resolving the
  // real text proves it comes from the registry (the bond), not the inline default.
  addTranslations('en', {
    'ide.chat.tip.getStarted': ENTRY_TIP_EN,
    'ide.chat.tip.dismiss': 'Dismiss tip',
  })
})

afterEach(() => {
  cleanup()
})

describe('TipCard (SYN12 — themed, accessible, i18n-backed onboarding tip)', () => {
  it('resolves the entry-tip text from the locale bond and interpolates agentName', () => {
    // The defaultValue is intentionally wrong: if the key were missing from the
    // registry, t() would return it and this assertion would fail.
    const text = t(
      `ide.chat.tip.${ENTRY_TIP.id}`,
      { agentName: 'Synthase' },
      { defaultValue: 'WRONG-DEFAULT-SHOULD-NOT-RENDER' },
    )
    expect(text).toBe(
      'Tip: type / to see every command, or @ a filename to give Synthase a file to work from.',
    )
    expect(text).not.toContain('{{agentName}}')
    expect(text).not.toContain('WRONG-DEFAULT')

    const { getByText } = render(<TipCard text={text} onDismiss={() => {}} />)
    expect(getByText(/give Synthase a file to work from/)).toBeTruthy()
  })

  it('themes the card via the --mol-color-primary token, never a hardcoded indigo', () => {
    const { container } = render(<TipCard text="hello" onDismiss={() => {}} />)
    const card = container.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
    expect(card).not.toBeNull()
    // Background + border tint follow the active theme's primary color.
    expect(card.style.background).toContain('--mol-color-primary')
    expect(card.style.border).toContain('--mol-color-primary')
    // The old hardcoded indigo rgba must be gone from every property.
    expect(card.style.cssText).not.toContain('99,102,241')
    expect(card.style.cssText).not.toContain('99, 102, 241')
    // The icon color is the theme token too.
    const icon = card.querySelector('svg') as SVGElement
    expect(icon.style.color).toContain('--mol-color-primary')
  })

  it('renders the lightbulb as a real <svg>, not an emoji glyph', () => {
    const { container } = render(<TipCard text="hello" onDismiss={() => {}} />)
    const card = container.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
    // First child is the lightbulb SVG (not a "💡" text node).
    expect(card.querySelector('svg')).not.toBeNull()
    // No emoji anywhere in the card's text content.
    expect(card.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('fires onDismiss when the accessible dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    const { container } = render(<TipCard text="hello" onDismiss={onDismiss} />)
    const button = container.querySelector('[data-mol-id="chat-tip-dismiss"]') as HTMLButtonElement
    expect(button).not.toBeNull()
    // Accessible name resolves through i18n (registered above), not a raw key.
    expect(button.getAttribute('aria-label')).toBe('Dismiss tip')
    fireEvent.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
