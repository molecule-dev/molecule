// @vitest-environment jsdom

/**
 * SYN15 (Synthase self-aware of its commands) — single-source-of-truth guard
 * for the slash-command registry.
 *
 * The MVP audit found the system prompt's "Available Commands" section was a
 * HAND-DUPLICATED copy of this package's authoritative `COMMANDS` registry that
 * had already drifted (7 of 25 commands), so Synthase denied shipped commands
 * like `/share`. The duplication existed because the registry lived inside this
 * React package's `components/` and was only reachable through the React-pulling
 * barrel — the API could not import it across the api/app boundary. The original
 * test was circular (it imported the mirror and asserted it against itself), so
 * it could never detect the drift.
 *
 * The fix extracts a React-free {@link module:../command-metadata} module as the
 * sole definition site, re-exported by the chat-panel `chat-commands` registry
 * and exposed through the `@molecule/app-ide-react/command-metadata` subpath so
 * the API system prompt can read the SAME array.
 *
 * This test guards that wiring two ways that the circular test could not:
 *   1. **No fork** — the registry the chat components import (`chat-commands`) is
 *      the EXACT same `COMMANDS` reference as the React-free metadata module, so
 *      a second copy cannot silently drift back in.
 *   2. **Rendered surface = registry** — rendering the real {@link SettingsCard}
 *      (which groups straight from the registry) surfaces EVERY authoritative
 *      command in the DOM and no extras, so adding/removing a command can never
 *      leave the user-facing command reference behind. This is the package-side
 *      analogue of the prompt-side "rendered section contains every COMMANDS
 *      label" check the audit's recommended fix calls for.
 *
 * @module
 */

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { COMMANDS as METADATA_COMMANDS } from '../command-metadata.js'
import {
  COMMANDS as REGISTRY_COMMANDS,
  groupCommandsByCategory,
} from '../components/chat-commands.js'
import {
  buildSettingsList,
  type SettingsDisplayValues,
} from '../components/chat-settings-utilities.js'
import { SettingsCard } from '../components/SettingsCard.js'

/**
 * A ClassMap stub whose every member resolves to its key as a class token, so
 * the card renders without depending on a concrete styling bond.
 *
 * @returns A stub {@link UIClassMap}.
 */
function buildStubClassMap(): UIClassMap {
  const token =
    (name: string) =>
    (..._args: unknown[]): string =>
      name
  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string' && c) out.push(c)
    }
    classes.forEach(walk)
    return out.join(' ')
  }
  return new Proxy(
    {},
    {
      get(_t, prop): unknown {
        if (prop === 'cn') return cn
        return token(String(prop))
      },
    },
  ) as unknown as UIClassMap
}

const SAMPLE_SETTINGS: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  mode: 'Execute',
  effort: 'Balanced (M)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  sounds: '3 of 9 events enabled',
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // Empty 'en' provider → `t()` falls through to the inline defaultValue.
  setProvider(createSimpleI18nProvider('en'))
})

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
    const { container } = render(
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
      />,
    )

    // Every authoritative command must be present in the rendered reference.
    for (const cmd of METADATA_COMMANDS) {
      const row = container.querySelector(`[data-mol-id="settings-command-${cmd.id}"]`)
      expect(row, `command "/${cmd.id}" should render in the /settings card`).not.toBeNull()
      // The card shows `usage ?? label` in its <code> element.
      const code = row?.querySelector('code')
      expect(code?.textContent).toBe(cmd.usage ?? cmd.label)
    }

    // …and nothing beyond the registry (catches inverse drift — a stray row).
    const rendered = container.querySelectorAll('[data-mol-id^="settings-command-"]')
    expect(rendered.length).toBe(METADATA_COMMANDS.length)
  })

  it('renders the registry grouped by its category order', () => {
    const { container } = render(
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
      />,
    )
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
