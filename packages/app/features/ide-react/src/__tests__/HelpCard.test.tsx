// @vitest-environment jsdom

/**
 * P2-12 — `/help` high-level-guide card regression guard.
 *
 * Per the user, `/help` no longer relists every command (typing `/` opens the
 * command menu, which does that better). It is now a concise guide: an intro,
 * the three conversation modes, the efficiency tips, and the host upgrade CTA.
 *
 * This is a real jsdom render of {@link HelpCard} with the REAL
 * `@molecule/app-ui-tailwind` ClassMap, so class/token assertions bite. The icon
 * set is a name-encoding stub (each glyph renders a real `<svg>` whose single
 * `<path d>` equals the requested name) so the modes render without a build
 * dependency on the icon bond.
 *
 * It would fail if anyone re-added the command relist (the `help-commands`
 * container or any `help-command-*` row), reverted `/help` to the plain-text
 * `──` blob, or dropped the modes/tips/upgrade sections.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { COMMANDS } from '../components/chat-commands.js'
import { HelpCard } from '../components/HelpCard.js'

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  // Name-encoding icon set: every glyph renders a real <svg> whose single path
  // `d` is the requested name (the modes section uses real glyphs).
  setIconSet(
    new Proxy(
      {},
      {
        get: (_t, name: string | symbol) => ({
          paths: [{ d: String(name) }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
})

afterEach(() => {
  cleanup()
})

/**
 * Wraps children with the i18n context HelpCard needs for `t()`.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

describe('HelpCard (P2-12 — concise high-level guide, no command relist)', () => {
  it('renders the guide sections (modes + tips), not a command relist', () => {
    const { container } = render(
      <Wrap>
        <HelpCard isLight />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="help-card"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="help-modes"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="help-tips"]')).not.toBeNull()
  })

  it('does NOT relist the slash commands (typing / does that better)', () => {
    const { container } = render(
      <Wrap>
        <HelpCard isLight />
      </Wrap>,
    )
    // The whole Commands block + every per-command button is gone.
    expect(container.querySelector('[data-mol-id="help-commands"]')).toBeNull()
    for (const cmd of COMMANDS) {
      expect(
        container.querySelector(`[data-mol-id="help-command-${cmd.id}"]`),
        `command ${cmd.id} must NOT render a row`,
      ).toBeNull()
    }
    // No command-category headings/glyphs either.
    expect(container.querySelector('[data-mol-id^="help-category-"]')).toBeNull()
  })

  it('is NOT the old muted monospace ASCII-divider text blob', () => {
    const { container } = render(
      <Wrap>
        <HelpCard isLight />
      </Wrap>,
    )
    // The `── … ──` section dividers the plain-text fallback uses must NOT appear
    // in the rich card — that decoration is what made it look unpolished.
    expect(container.textContent).not.toContain('──')
  })

  it('styles via ClassMap tokens, never a hardcoded hex in the mode/tip row inline styles', () => {
    const { container } = render(
      <Wrap>
        <HelpCard isLight />
      </Wrap>,
    )
    const card = container.querySelector('[data-mol-id="help-card"]') as HTMLElement
    // The card adopts the shared chat-card chrome — a theme-token tint + a uniform
    // 1px border on all sides (chat-card-style) — like its sibling cards, rather than
    // a flat gray surface class.
    expect(card.className).not.toContain(classMap.surfaceSecondary)
    expect(card.style.border).toContain('1px solid')
    expect(card.style.border).toContain('--mol-color-primary')
    // No mode/tip row hardcodes a hex color inline (theme tokens / classes only).
    for (const row of container.querySelectorAll(
      '[data-mol-id^="help-mode-"], [data-mol-id^="help-tip-"]',
    )) {
      expect((row as HTMLElement).getAttribute('style') ?? '').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('renders the host-supplied upgrade blurb with a clickable CTA (shared pkg owns no pricing)', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Wrap>
        <HelpCard
          isLight
          upgradeLines={['You are on the Free plan.', 'Upgrade for more.']}
          upgradeAction={{ label: 'View plans', onClick }}
        />
      </Wrap>,
    )
    const upgrade = container.querySelector('[data-mol-id="help-upgrade"]')
    expect(upgrade?.textContent).toContain('You are on the Free plan.')
    const cta = container.querySelector('[data-mol-id="help-upgrade-action"]') as HTMLElement
    expect(cta, 'an upgrade CTA should render').not.toBeNull()
    fireEvent.click(cta)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('interpolates the host agent/product name and leaves no raw {{tokens}}', () => {
    const { container } = render(
      <Wrap>
        <HelpCard isLight agentName="Fable" productName="Acme Studio" />
      </Wrap>,
    )
    expect(container.textContent).toContain('Fable')
    expect(container.textContent).toContain('Acme Studio')
    expect(container.textContent).not.toContain('{{agentName}}')
    expect(container.textContent).not.toContain('{{productName}}')
  })
})
