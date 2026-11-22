// @vitest-environment jsdom

/**
 * SYN15 (Synthase self-aware of its commands) — single-source-of-truth guard
 * for the slash-command registry.
 *
 * The MVP audit found the system prompt's "Available Commands" section was a
 * HAND-DUPLICATED copy of the authoritative `COMMANDS` registry that had
 * already drifted (7 of 25 commands). The fix extracts a framework-neutral
 * `command-metadata` module as the sole definition site, re-exported by the
 * chat-panel `chat-commands` registry.
 *
 * This test guards that wiring two ways:
 *   1. **No fork** — the registry the chat components import (`panels`) is the
 *      EXACT same `COMMANDS` reference as the framework-neutral metadata module,
 *      so a second copy cannot silently drift back in.
 *   2. **Rendered surface = registry** — rendering the real {@link SettingsCard}
 *      (which groups straight from the registry) surfaces EVERY authoritative
 *      command in the DOM and no extras, so adding/removing a command can never
 *      leave the user-facing command reference behind.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/command-metadata.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { COMMANDS as METADATA_COMMANDS } from '@molecule/app-ide-panel-logic/command-metadata'
import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import {
  COMMANDS as REGISTRY_COMMANDS,
  groupCommandsByCategory,
} from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import SettingsCard from '../parts/SettingsCard.svelte'
import type { SettingsCardProps } from '../types.js'

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

/** The mounts alive right now, torn down before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  // Empty 'en' provider → `t()` falls through to the inline defaultValue.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the settings card the way the chat panel does.
 *
 * @returns The container the card rendered into.
 */
function renderSettingsCard(): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props: SettingsCardProps = {
    settings: buildSettingsList(SAMPLE_SETTINGS),
    onRunCommand: () => {},
    isLight: false,
  }
  const instance = mount(SettingsCard, { target: container, props }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
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
    const container = renderSettingsCard()

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
    const container = renderSettingsCard()
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
