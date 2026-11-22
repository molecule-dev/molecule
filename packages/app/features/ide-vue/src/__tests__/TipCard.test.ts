// @vitest-environment jsdom
/**
 * SYN12 — auto-tip card render + i18n + theming regression guard: a port of
 * `@molecule/app-ide-react/src/__tests__/TipCard.test.tsx` with the same test
 * names and the same assertions, mounted through Vue's own `createApp`.
 *
 * The tip text resolves from the locale REGISTRY (a deliberately-wrong inline
 * `defaultValue` is supplied and must be ignored), the card is themed via the
 * `--mol-color-primary` theme token (light/dark + per-app brand aware, never
 * the old hardcoded indigo `rgba(99,102,241,…)`), the tip icon (the bonded
 * `lightbulb` glyph) is a real `<svg>`, not an emoji glyph, and the dismiss
 * control is an accessible button that fires `onDismiss`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { addTranslations, createSimpleI18nProvider, setProvider, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { ENTRY_TIP } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { TipCardProps } from '../parts/TipCard.js'
import { TipCard } from '../parts/TipCard.js'

/** The English source the locale bond ships for the entry tip (verbatim). */
const ENTRY_TIP_EN =
  'Tip: type / to see every command, or @ a filename to give {{agentName}} a file to work from.'

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  // The REAL themed ClassMap, so the card's resolved classes are actual tokens.
  setClassMap(classMap)
  // Stub the bonded icon set so the lightbulb <Icon> resolves to a real <svg>.
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
  // Register the bond's English strings on the live i18n singleton TipCard
  // reads through. A WRONG default is passed at the call site below, so
  // resolving the real text proves it comes from the registry (the bond), not
  // the inline default.
  addTranslations('en', {
    'ide.chat.tip.getStarted': ENTRY_TIP_EN,
    'ide.chat.tip.dismiss': 'Dismiss tip',
  })
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render the tip card the way ChatPanel does.
 *
 * @param props - Props to render with.
 * @returns The host element.
 */
function renderTipCard(
  props: Partial<TipCardProps> & Pick<TipCardProps, 'text' | 'onDismiss'>,
): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(TipCard, props),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

describe('TipCard (SYN12 — themed, accessible, i18n-backed onboarding tip)', () => {
  it('resolves the entry-tip text from the locale bond and interpolates agentName', () => {
    // The defaultValue is intentionally wrong: if the key were missing from
    // the registry, t() would return it and this assertion would fail.
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

    const host = renderTipCard({ text, onDismiss: () => {} })
    expect(host.textContent ?? '').toContain('give Synthase a file to work from')
  })

  it('themes the card via the --mol-color-primary token, never a hardcoded indigo', () => {
    const host = renderTipCard({ text: 'hello', onDismiss: () => {} })
    const card = host.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
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

  it('renders the tip icon as a real <svg> lightbulb, not an emoji glyph', () => {
    const host = renderTipCard({ text: 'hello', onDismiss: () => {} })
    const card = host.querySelector('[data-mol-id="chat-tip-card"]') as HTMLElement
    // First child is the tip-icon SVG (not a "💡" text node).
    const svg = card.querySelector('svg')
    expect(svg).not.toBeNull()
    // It is specifically the bonded `lightbulb` glyph — the stub renders the
    // icon name into the path `d` as `glyph:<name>`, so a regression to a
    // sparkle/other glyph (or an emoji) fails here.
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe('glyph:lightbulb')
    // No emoji anywhere in the card's text content.
    expect(card.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('fires onDismiss when the accessible dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    const host = renderTipCard({ text: 'hello', onDismiss })
    const button = host.querySelector('[data-mol-id="chat-tip-dismiss"]') as HTMLButtonElement
    expect(button).not.toBeNull()
    // Accessible name resolves through i18n (registered above), not a raw key.
    expect(button.getAttribute('aria-label')).toBe('Dismiss tip')
    button.click()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
