// @vitest-environment jsdom
/**
 * SYN15 (Synthase self-aware of its commands) — single-source-of-truth guard
 * for the slash-command registry.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/command-metadata.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * The registry lives in the React-free `@molecule/app-ide-panel-logic` module;
 * both bindings import the same array, so no second copy can drift back in. The
 * rendered `/settings` command reference groups straight from that registry, so
 * this pins that every authoritative command surfaces in the DOM — and nothing
 * beyond it.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

import { SettingsCard } from '../parts/settings-card.component.js'

/** The settings values the card renders. */
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

/** The JIT host: its template binds every input the card takes. */
const SettingsCardHost = Component({
  selector: 'mol-command-metadata-host',
  standalone: true,
  imports: [SettingsCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-settings-card [settings]="p['settings']" [onRunCommand]="p['onRunCommand']" [isLight]="p['isLight']"></div>`,
})(
  class SettingsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  // Empty 'en' provider → `t()` falls through to the inline defaultValue.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders the settings card.
 * @returns The rendered container.
 */
async function renderSettings(): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof SettingsCardHost>> = createComponent(
    SettingsCardHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    settings: buildSettingsList(SAMPLE_SETTINGS),
    onRunCommand: () => {},
    isLight: false,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  appRef.tick()
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
  it('surfaces a DOM row for every command in the registry, and no extras', async () => {
    const container = await renderSettings()

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

  it('renders the registry grouped by its category order', async () => {
    const container = await renderSettings()
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
