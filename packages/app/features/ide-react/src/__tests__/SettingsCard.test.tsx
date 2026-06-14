// @vitest-environment jsdom

/**
 * SYN11 — `/settings` view completeness + single-source regression guard.
 *
 * The MVP intent audit flagged that the "view ALL settings" panel UNDERSTATED a
 * user's configuration: it hid the Effort setting (while listing its `/effort`
 * command in the very same card) and collapsed the per-mode plan/execute models
 * into one "Model" row — and no single source bound the panel to the canonical
 * settings list. The fix moved the setting list into the React-free
 * {@link SETTINGS} metadata (the shared single source, mirroring `COMMANDS`),
 * had `buildSettingsList` derive the view from it, and split out the per-mode
 * rows + the Effort row.
 *
 * This is a real jsdom render of {@link SettingsCard} with the REAL
 * `@molecule/app-ui-tailwind` ClassMap, so the class/token + Tooltip assertions
 * bite. It would fail if anyone re-collapsed the per-mode models, dropped the
 * Effort row, forked the view off the shared metadata, or reverted the edit
 * affordance from the framework styled Tooltip back to a native `title`.
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

import {
  buildSettingsList,
  type SettingsDisplayValues,
} from '../components/chat-settings-utilities.js'
import { SettingsCard } from '../components/SettingsCard.js'
import { SETTINGS } from '../settings-metadata.js'

const SAMPLE_VALUES: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  mode: 'Execute',
  effort: 'Maximum (XL)',
  maxLoops: '100',
  autoFix: 'On',
  sounds: '3 of 9 events enabled',
}

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(() => {
  cleanup()
})

/**
 * Wraps children with the i18n context SettingsCard needs for `t()`.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

describe('SettingsCard (SYN11 — complete settings view, single source of truth)', () => {
  it('renders a row for EVERY canonical setting, in metadata order, and no extras', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard
          settings={buildSettingsList(SAMPLE_VALUES)}
          onRunCommand={vi.fn()}
          onPrefillInput={vi.fn()}
          isLight
        />
      </Wrap>,
    )
    const renderedIds = Array.from(container.querySelectorAll('[data-mol-id^="setting-row-"]')).map(
      (el) => el.getAttribute('data-mol-id')?.replace('setting-row-', ''),
    )
    // Same ids, same order as the shared source — the panel cannot drift from it.
    expect(renderedIds).toEqual(SETTINGS.map((s) => s.id))
  })

  it('surfaces the Effort row (no longer hidden while its /effort command is listed)', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard settings={buildSettingsList(SAMPLE_VALUES)} onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    const effortRow = container.querySelector('[data-mol-id="setting-row-effort"]')
    expect(effortRow, 'the Effort setting must appear in the panel').not.toBeNull()
    expect(effortRow?.textContent).toContain('Maximum (XL)')
    // The /effort command it edits is also listed in the command reference.
    expect(container.querySelector('[data-mol-id="settings-command-effort"]')).not.toBeNull()
  })

  it('splits the per-mode plan/execute models into distinct rows (not one collapsed Model row)', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard settings={buildSettingsList(SAMPLE_VALUES)} onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    const defaultModel = container.querySelector('[data-mol-id="setting-row-model"]')
    const planModel = container.querySelector('[data-mol-id="setting-row-planModel"]')
    const executeModel = container.querySelector('[data-mol-id="setting-row-executeModel"]')
    expect(defaultModel?.textContent).toContain('Claude Opus 4.6')
    expect(planModel, 'the plan-mode model must be its own row').not.toBeNull()
    expect(planModel?.textContent).toContain('Claude Sonnet 4.6')
    expect(executeModel, 'the execute-mode model must be its own row').not.toBeNull()
    expect(executeModel?.textContent).toContain('DeepSeek V4 Flash')
  })

  it('edits a per-mode model via the mode-scoped command input, not the generic /model picker', () => {
    const onRunCommand = vi.fn()
    const onPrefillInput = vi.fn()
    const { container } = render(
      <Wrap>
        <SettingsCard
          settings={buildSettingsList(SAMPLE_VALUES)}
          onRunCommand={onRunCommand}
          onPrefillInput={onPrefillInput}
          isLight
        />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector('[data-mol-id="setting-edit-planModel"]') as HTMLElement,
    )
    expect(onPrefillInput).toHaveBeenCalledWith('/model --plan')
    fireEvent.click(
      container.querySelector('[data-mol-id="setting-edit-executeModel"]') as HTMLElement,
    )
    expect(onPrefillInput).toHaveBeenCalledWith('/model --execute')
    // A scoped row must NOT fall through to the generic /model command.
    expect(onRunCommand).not.toHaveBeenCalledWith('model')
  })

  it('runs the bare command for a non-scoped setting (effort)', () => {
    const onRunCommand = vi.fn()
    const { container } = render(
      <Wrap>
        <SettingsCard
          settings={buildSettingsList(SAMPLE_VALUES)}
          onRunCommand={onRunCommand}
          onPrefillInput={vi.fn()}
          isLight
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="setting-edit-effort"]') as HTMLElement)
    expect(onRunCommand).toHaveBeenCalledWith('effort')
  })

  it('reveals each edit affordance via the framework styled Tooltip, never a native title', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard settings={buildSettingsList(SAMPLE_VALUES)} onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    // No part of the card uses the delayed, unstyled, touch-blind native title.
    expect(container.querySelector('[title]')).toBeNull()

    const planEdit = container.querySelector(
      '[data-mol-id="setting-edit-planModel"]',
    ) as HTMLElement
    // Hovering the Tooltip trigger (the button's wrapper) mounts a role="tooltip"
    // popover in a portal showing the EXACT mode-scoped command — a native title
    // would produce no such element.
    fireEvent.mouseEnter(planEdit.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(
      tooltip,
      'the edit affordance must reveal its command via the styled Tooltip',
    ).not.toBeNull()
    expect(tooltip?.textContent).toContain('/model --plan')
    fireEvent.mouseLeave(planEdit.parentElement as HTMLElement)
  })

  it('styles via ClassMap theme tokens, never a hardcoded hex in row inline styles', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard settings={buildSettingsList(SAMPLE_VALUES)} onRunCommand={vi.fn()} isLight />
      </Wrap>,
    )
    const card = container.querySelector('[data-mol-id="settings-card"]') as HTMLElement
    // The card adopts the shared surface token, like its sibling cards.
    expect(card.className).toContain(classMap.surfaceSecondary)
    // No setting row hardcodes a hex color inline (theme tokens / classes only).
    for (const setting of SETTINGS) {
      const row = container.querySelector(
        `[data-mol-id="setting-row-${setting.id}"]`,
      ) as HTMLElement
      expect(row.getAttribute('style') ?? '', `setting ${setting.id}`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      )
    }
  })

  it('interpolates the host agent name into the descriptions, leaving no raw {{tokens}}', () => {
    const { container } = render(
      <Wrap>
        <SettingsCard
          settings={buildSettingsList(SAMPLE_VALUES)}
          onRunCommand={vi.fn()}
          isLight
          agentName="Fable"
        />
      </Wrap>,
    )
    expect(container.textContent).toContain('Fable')
    expect(container.textContent).not.toContain('{{agentName}}')
  })
})
