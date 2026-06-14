// @vitest-environment jsdom

/**
 * SYN8 — `/models` table visual-quality regression guard.
 *
 * The MVP intent audit flagged that the table "passed on paper" but missed the
 * bar three ways: (1) the "Speed" column was fabricated from input price, so it
 * duplicated the Cost axis and could be factually wrong; (2) sort headers used a
 * unicode `▲`/`▼` glyph (and only on the active column) rather than the real SVG
 * icon set; (3) the cost cell crammed an inline `($in+$out)` breakdown that made
 * the table too wide to read in the chat column.
 *
 * This is a real jsdom render of {@link ModelsTable} with the REAL
 * `@molecule/app-ui-tailwind` ClassMap, so class/token assertions bite. The icon
 * set is a name-encoding stub: each glyph renders a real `<svg>` whose single
 * `<path d>` equals the requested icon name, letting the test assert the EXACT
 * glyph per header state without a build dependency on the icon bond.
 *
 * It would fail if anyone reverted to: a unicode/emoji sort arrow (no `<svg>`,
 * `▲`/`▼` text reappears), a native `title` attribute instead of the framework
 * Tooltip (no `role="tooltip"` on hover), a fabricated Speed/tier column
 * (Speed/Balanced/Powerful text reappears), or a hardcoded hex header accent.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ModelsTable } from '../components/ModelsTable.js'

/**
 * Builds a model with sensible defaults, overriding only the fields a given
 * assertion cares about.
 * @param overrides - Partial fields to override.
 * @returns A complete {@link AppModelDefinition}.
 */
function model(overrides: Partial<AppModelDefinition>): AppModelDefinition {
  return {
    id: 'm',
    provider: 'anthropic',
    label: 'Model',
    description: 'desc',
    contextWindow: 200_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

const MODELS: readonly AppModelDefinition[] = [
  model({
    id: 'free-fast',
    label: 'Aurora',
    inputPricePerMTok: 0.5,
    outputPricePerMTok: 2,
    knowledgeCutoff: '2024-04-01',
    freeTier: true,
  }),
  model({
    id: 'mid',
    label: 'Mid',
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    knowledgeCutoff: '2024-10-01',
  }),
  model({
    id: 'apex',
    label: 'Apex',
    inputPricePerMTok: 15,
    outputPricePerMTok: 75,
    knowledgeCutoff: '2025-06-01',
  }),
]

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
 * Wraps children with the i18n context ModelsTable needs for `t()`.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/** Reads the icon-name encoded into a sort-header glyph's `<svg><path d>`. */
function glyphName(root: HTMLElement, column: string): string | null | undefined {
  const svg = root.querySelector(`[data-mol-id="models-sort-glyph-${column}"]`)
  return svg?.querySelector('path')?.getAttribute('d')
}

const SORTABLE_COLUMNS = ['name', 'context', 'cost', 'cutoff', 'free'] as const

describe('ModelsTable (SYN8 — real SVG sort glyphs, Tooltip, independent axis)', () => {
  it('renders an SVG sort glyph on EVERY header and never a unicode arrow', () => {
    const { container } = render(
      <Wrap>
        <ModelsTable models={MODELS} isLight />
      </Wrap>,
    )
    for (const col of SORTABLE_COLUMNS) {
      const header = container.querySelector(`[data-mol-id="models-sort-${col}"]`)
      expect(header, `header ${col} should render`).not.toBeNull()
      const glyph = header?.querySelector('svg')
      expect(glyph, `header ${col} must carry an <svg> sort glyph, not text`).not.toBeNull()
    }
    // The old unicode arrows must be gone entirely — no emoji/glyph fallback.
    expect(container.textContent).not.toContain('▲')
    expect(container.textContent).not.toContain('▼')
  })

  it('shows a neutral chevrons-up-down on inactive headers and a direction chevron on the active one', () => {
    const { container } = render(
      <Wrap>
        <ModelsTable models={MODELS} isLight />
      </Wrap>,
    )
    // Default sort is name-ascending: name gets the up chevron, the rest neutral.
    expect(glyphName(container, 'name')).toBe('chevron-up')
    expect(glyphName(container, 'cost')).toBe('chevrons-up-down')
    expect(glyphName(container, 'cutoff')).toBe('chevrons-up-down')

    const costHeader = container.querySelector('[data-mol-id="models-sort-cost"]') as HTMLElement
    // First click → cost ascending; name reverts to the neutral glyph.
    fireEvent.click(costHeader)
    expect(glyphName(container, 'cost')).toBe('chevron-up')
    expect(glyphName(container, 'name')).toBe('chevrons-up-down')
    // Second click on the same header → descending.
    fireEvent.click(costHeader)
    expect(glyphName(container, 'cost')).toBe('chevron-down')
  })

  it('renders the cost as the framework Tooltip (not a native title) revealing the breakdown', () => {
    const { container } = render(
      <Wrap>
        <ModelsTable models={MODELS} isLight />
      </Wrap>,
    )
    const cost = container.querySelector('[data-mol-id="models-cost-mid"]') as HTMLElement
    expect(cost, 'cost cell should render').not.toBeNull()
    expect(cost.textContent).toContain('$18.00')
    // The breakdown must NOT be the delayed, unstyled, touch-blind native title.
    expect(cost.hasAttribute('title')).toBe(false)
    expect((cost.closest('td') as HTMLElement).hasAttribute('title')).toBe(false)
    // Hovering the Tooltip trigger mounts a role="tooltip" popover in a portal —
    // a native title produces no such element, so this only passes with the
    // real framework Tooltip wired.
    fireEvent.mouseEnter(cost.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'cost cell must render the styled Tooltip on hover').not.toBeNull()
    expect(tooltip?.textContent).toContain('$3.00')
    expect(tooltip?.textContent).toContain('$15.00')
    fireEvent.mouseLeave(cost.parentElement as HTMLElement)
  })

  it('replaced the fabricated Speed column with a real, independent knowledge-cutoff axis', () => {
    const { container } = render(
      <Wrap>
        <ModelsTable models={MODELS} isLight />
      </Wrap>,
    )
    // The fabricated price-derived tier labels must be gone.
    for (const dead of ['Speed', 'Balanced', 'Powerful', 'Fast']) {
      expect(container.textContent, `"${dead}" must not appear`).not.toContain(dead)
    }
    // A real Cutoff header + the factual knowledge-cutoff dates render.
    expect(container.querySelector('[data-mol-id="models-sort-cutoff"]')?.textContent).toContain(
      'Cutoff',
    )
    expect(container.textContent).toContain('2024-04-01')
    expect(container.textContent).toContain('2025-06-01')
  })

  it('themes the active header accent via a token, never a hardcoded hex', () => {
    const cm = classMap
    const { container } = render(
      <Wrap>
        <ModelsTable models={MODELS} isLight />
      </Wrap>,
    )
    const nameHeader = container.querySelector('[data-mol-id="models-sort-name"]') as HTMLElement
    const costHeader = container.querySelector('[data-mol-id="models-sort-cost"]') as HTMLElement
    // The active header carries no hardcoded hex color in its inline style.
    expect(nameHeader.getAttribute('style') ?? '').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    // The active header is styled via a class/token (no muted class), while an
    // inactive sibling carries the muted token — proving class/token-driven, not
    // a per-state hex.
    const muted = cm.textMuted
    expect(nameHeader.className).not.toContain(muted)
    expect(costHeader.className).toContain(muted)
  })
})
