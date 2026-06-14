// @vitest-environment jsdom

/**
 * SYN13 — `/help` interactive-card regression guard.
 *
 * The MVP intent audit flagged that `/help` was the least-polished surface in
 * the chat: a muted xs monospace ASCII-divider TEXT BLOB rendered through the
 * generic system-card branch, while every sibling command (`/models`,
 * `/settings`, `/skills`, `/scripts`) rendered as a real interactive card — and
 * its listed commands were not clickable.
 *
 * This is a real jsdom render of {@link HelpCard} with the REAL
 * `@molecule/app-ui-tailwind` ClassMap, so class/token assertions bite. The icon
 * set is a name-encoding stub: each glyph renders a real `<svg>` whose single
 * `<path d>` equals the requested icon name, letting the test assert the EXACT
 * category glyph without a build dependency on the icon bond.
 *
 * It would fail if anyone reverted `/help` to the plain-text blob: the command
 * rows would stop being clickable buttons (no `onRunCommand`), the `──` divider
 * text would reappear, the category headings would lose their SVG glyphs, or the
 * usage syntax would degrade from the framework Tooltip to a native `title`.
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

import { COMMAND_CATEGORIES, COMMANDS } from '../components/chat-commands.js'
import { CATEGORY_ICON, HelpCard } from '../components/HelpCard.js'

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  // Name-encoding icon set: every glyph renders a real <svg> whose single path
  // `d` is the requested name, so the test can read which glyph each header got.
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

describe('HelpCard (SYN13 — interactive /help card, not a text blob)', () => {
  it('renders EVERY registry command as a clickable button that runs/prefills it', () => {
    const onRunCommand = vi.fn()
    const { container } = render(
      <Wrap>
        <HelpCard onRunCommand={onRunCommand} isLight />
      </Wrap>,
    )

    for (const cmd of COMMANDS) {
      const row = container.querySelector(`[data-mol-id="help-command-${cmd.id}"]`)
      expect(row, `command ${cmd.id} should render a row`).not.toBeNull()
      // A real interactive control, not a line of text.
      expect(row?.tagName, `command ${cmd.id} row must be a <button>`).toBe('BUTTON')
      // Its mono label must be present.
      expect(row?.textContent).toContain(cmd.label)
    }

    // Clicking a row runs/prefills exactly that command.
    const skills = container.querySelector('[data-mol-id="help-command-skills"]') as HTMLElement
    fireEvent.click(skills)
    expect(onRunCommand).toHaveBeenCalledWith('skills')
  })

  it('is NOT the old muted monospace ASCII-divider text blob', () => {
    const { container } = render(
      <Wrap>
        <HelpCard onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    // The `── … ──` section dividers the plain-text fallback uses must NOT appear
    // in the rich card — that decoration is what made it look unpolished.
    expect(container.textContent).not.toContain('──')
  })

  it('heads each command category with a real SVG glyph from the icon set (no emoji)', () => {
    const { container } = render(
      <Wrap>
        <HelpCard onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    for (const category of COMMAND_CATEGORIES) {
      const hasCommands = COMMANDS.some((c) => c.category === category.key)
      if (!hasCommands) continue
      const glyph = container.querySelector(
        `[data-mol-id="help-category-icon-${category.key}"]`,
      ) as SVGElement | null
      expect(glyph, `category ${category.key} must render an icon`).not.toBeNull()
      expect(glyph?.tagName.toLowerCase(), 'the glyph must be an <svg>, not a text glyph').toBe(
        'svg',
      )
      // The exact icon-set glyph the card maps this category to.
      expect(glyph?.querySelector('path')?.getAttribute('d')).toBe(CATEGORY_ICON[category.key])
    }
    // No emoji crept into the card chrome.
    expect(container.textContent ?? '').not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
  })

  it('reveals a command argument syntax via the framework Tooltip, never a native title', () => {
    const { container } = render(
      <Wrap>
        <HelpCard onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    // /skills takes an optional [query] arg — its usage chip must render.
    const usage = container.querySelector('[data-mol-id="help-usage-skills"]') as HTMLElement
    expect(usage, 'a command with usage should show its syntax chip').not.toBeNull()
    expect(usage.textContent).toContain('/skills [query]')

    // No part of the card uses the delayed, unstyled, touch-blind native title.
    expect(container.querySelector('[title]')).toBeNull()

    // Hovering the Tooltip trigger (the chip's wrapper) mounts a role="tooltip"
    // popover in a portal — a native title produces no such element.
    fireEvent.mouseEnter(usage.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'usage chip must render the styled Tooltip on hover').not.toBeNull()
    expect(tooltip?.textContent).toContain('/skills [query]')
    fireEvent.mouseLeave(usage.parentElement as HTMLElement)
  })

  it('styles via ClassMap tokens, never a hardcoded hex in command-row inline styles', () => {
    const { container } = render(
      <Wrap>
        <HelpCard onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    const card = container.querySelector('[data-mol-id="help-card"]') as HTMLElement
    // The card adopts the same surface token as the sibling cards.
    expect(card.className).toContain(classMap.surfaceSecondary)
    // No command row hardcodes a hex color inline (theme tokens / classes only).
    for (const cmd of COMMANDS) {
      const row = container.querySelector(`[data-mol-id="help-command-${cmd.id}"]`) as HTMLElement
      expect(row.getAttribute('style') ?? '', `command ${cmd.id}`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      )
    }
  })

  it('renders the host-supplied upgrade blurb with a clickable CTA (shared pkg owns no pricing)', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Wrap>
        <HelpCard
          onRunCommand={vi.fn()}
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
        <HelpCard onRunCommand={vi.fn()} isLight agentName="Fable" productName="Acme Studio" />
      </Wrap>,
    )
    expect(container.textContent).toContain('Fable')
    expect(container.textContent).toContain('Acme Studio')
    expect(container.textContent).not.toContain('{{agentName}}')
    expect(container.textContent).not.toContain('{{productName}}')
  })
})
