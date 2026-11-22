// @vitest-environment jsdom

/**
 * SYN15 (Synthase self-aware of its commands) — single-source-of-truth guard
 * for the slash-command registry.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/command-metadata.test.tsx`
 * with the same test names and the same assertions: the registry the chat
 * components import (`panels`) is the EXACT same array as the React-free
 * metadata module (no fork to drift), and rendering the real SettingsCard —
 * which groups straight from the registry — surfaces EVERY authoritative
 * command in the DOM and no extras, in the registry's category order.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { COMMANDS as METADATA_COMMANDS } from '@molecule/app-ide-panel-logic/command-metadata'
import {
  buildSettingsList,
  COMMANDS as REGISTRY_COMMANDS,
  groupCommandsByCategory,
  type SettingsDisplayValues,
} from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SettingsCard } from '../parts/SettingsCard.jsx'

const SAMPLE_SETTINGS: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  commitModel: 'Fast default',
  compactModel: 'Fast default',
  mode: 'Execute',
  effort: 'Balanced (M)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: '3 of 9 events enabled',
  timestamps: 'Off',
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  // Empty 'en' provider → `t()` falls through to the inline defaultValue.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the `/settings` card.
 *
 * @returns The mounted container.
 */
function renderSettings(): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
      />
    ),
    container,
  )
  return container
}

describe('command registry is a single source of truth (SYN15)', () => {
  it('the chat-panel registry IS the React-free metadata array (no fork to drift)', () => {
    // Reference identity, not deep-equality: a re-export shares the array, a
    // hand-copied list would be a different reference even while it happened to
    // match — which is exactly how the prompt mirror drifted unnoticed.
    expect(REGISTRY_COMMANDS).toBe(METADATA_COMMANDS)
  })

  it('every command has a unique id and a slash-prefixed label', () => {
    const ids = METADATA_COMMANDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const cmd of METADATA_COMMANDS) {
      expect(cmd.label).toBe(`/${cmd.id}`)
    }
  })
})

describe('the /settings command reference renders every authoritative command (SYN15)', () => {
  it('surfaces a DOM row for every command in the registry, and no extras', () => {
    const container = renderSettings()

    // Every authoritative command must be present in the rendered reference.
    for (const cmd of METADATA_COMMANDS) {
      const row = container.querySelector(`[data-mol-id="settings-command-${cmd.id}"]`)
      expect(row, `command "/${cmd.id}" should render in the /settings card`).not.toBeNull()
      // The card shows `usage ?? label` in its <code> element.
      const code = row?.querySelector('code')
      expect(code?.textContent).toBe(('usage' in cmd ? cmd.usage : undefined) ?? cmd.label)
    }

    // …and nothing beyond the registry (catches inverse drift — a stray row).
    const rendered = container.querySelectorAll('[data-mol-id^="settings-command-"]')
    expect(rendered.length).toBe(METADATA_COMMANDS.length)
  })

  it('renders the registry grouped by its category order', () => {
    const container = renderSettings()
    // The card groups via groupCommandsByCategory(); the rendered command rows
    // must appear in that exact grouped order (so /share under "Collaborate"
    // can never be silently dropped from the reference).
    const expectedOrder = groupCommandsByCategory().flatMap((g) => g.commands.map((c) => c.id))
    const renderedOrder = Array.from(
      container.querySelectorAll('[data-mol-id^="settings-command-"]'),
    ).map((el) => el.getAttribute('data-mol-id')?.replace('settings-command-', ''))
    expect(renderedOrder).toEqual(expectedOrder)
  })
})
