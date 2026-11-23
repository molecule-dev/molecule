// @vitest-environment jsdom
/**
 * SettingsCard — the `/settings` card — rendered for real: a port of
 * `@molecule/app-ide-react/src/__tests__/SettingsCard.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Angular's own
 * `createApplication` (the card is PRESENTATIONAL: inputs in, callbacks out).
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

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { SETTINGS } from '@molecule/app-ide-panel-logic'
import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SettingsCard } from '../parts/settings-card.component.js'

const SAMPLE_VALUES: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  commitModel: 'Fast default',
  compactModel: 'Fast default',
  mode: 'Execute',
  effort: 'Maximum (XL)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: '3 of 9 events enabled',
  timestamps: 'Off',
}

/**
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input.
 */
const SettingsCardHost = Component({
  selector: 'mol-settings-card-host',
  standalone: true,
  imports: [SettingsCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-settings-card [settings]="p['settings']" [onRunCommand]="p['onRunCommand']" [onPrefillInput]="p['onPrefillInput']" [isLight]="p['isLight']" [agentName]="p['agentName']" [embedded]="p['embedded']"></div>`,
})(
  class SettingsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card, with the recorded calls and its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof SettingsCardHost>>
  container: HTMLElement
  runs: string[]
  prefills: string[]
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Render the card the way ChatPanel does.
 *
 * @param overrides - Inputs to override.
 * @returns The container plus the recorded calls.
 */
async function renderCard(overrides: Record<string, unknown> = {}): Promise<Mounted> {
  const runs: string[] = []
  const prefills: string[] = []
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof SettingsCardHost>> = createComponent(
    SettingsCardHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    settings: buildSettingsList(SAMPLE_VALUES),
    onRunCommand: (id: string) => runs.push(id),
    onPrefillInput: (input: string) => prefills.push(input),
    isLight: true,
    agentName: undefined,
    embedded: undefined,
    ...overrides,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container, runs, prefills }
  await flush()
  return current
}

/**
 * Hovers an element with a bubbling `mouseover` (what the framework Tooltip's
 * trigger wrapper listens to).
 *
 * @param el - The element to hover.
 */
async function hover(el: Element | null): Promise<void> {
  el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
  await flush()
}

describe('SettingsCard (SYN11 — complete settings view, single source of truth)', () => {
  it('renders a row for EVERY canonical setting, in metadata order, and no extras', async () => {
    const { container } = await renderCard()
    const renderedIds = Array.from(container.querySelectorAll('[data-mol-id^="setting-row-"]')).map(
      (el) => el.getAttribute('data-mol-id')?.replace('setting-row-', ''),
    )
    expect(renderedIds).toEqual(SETTINGS.map((s) => s.id))
  })

  it('surfaces the Auto-commit row with its Edit affordance (its /autocommit command was shown with no row)', async () => {
    const { container } = await renderCard()
    const row = molId(container, 'setting-row-autoCommit')
    expect(row, 'the Auto-commit setting must appear in the panel').not.toBeNull()
    expect(row?.textContent).toContain('Every 60s')
    expect(molId(container, 'setting-edit-autoCommit')).not.toBeNull()
    expect(molId(container, 'settings-command-autocommit')).not.toBeNull()
  })

  it('renders the Hooks row as a command-less row (no Edit button, file-configured)', async () => {
    const { container } = await renderCard()
    const row = molId(container, 'setting-row-hooks')
    expect(row, 'the Hooks setting must appear in the panel').not.toBeNull()
    expect(row?.textContent).toContain('In project settings')
    expect(molId(container, 'setting-edit-hooks')).toBeNull()
  })

  it('surfaces the Effort row (no longer hidden while its /effort command is listed)', async () => {
    const { container } = await renderCard()
    const effortRow = molId(container, 'setting-row-effort')
    expect(effortRow, 'the Effort setting must appear in the panel').not.toBeNull()
    expect(effortRow?.textContent).toContain('Maximum (XL)')
    expect(molId(container, 'settings-command-effort')).not.toBeNull()
  })

  it('splits the per-mode plan/execute models into distinct rows (not one collapsed Model row)', async () => {
    const { container } = await renderCard()
    const defaultModel = molId(container, 'setting-row-model')
    const planModel = molId(container, 'setting-row-planModel')
    const executeModel = molId(container, 'setting-row-executeModel')
    expect(defaultModel?.textContent).toContain('Claude Opus 4.6')
    expect(planModel, 'the plan-mode model must be its own row').not.toBeNull()
    expect(planModel?.textContent).toContain('Claude Sonnet 4.6')
    expect(executeModel, 'the execute-mode model must be its own row').not.toBeNull()
    expect(executeModel?.textContent).toContain('DeepSeek V4 Flash')
  })

  it('edits a per-mode model via the mode-scoped command input, not the generic /model picker', async () => {
    const { container, runs, prefills } = await renderCard()
    molId(container, 'setting-edit-planModel')?.click()
    await flush()
    expect(prefills).toContain('/model --plan')
    molId(container, 'setting-edit-executeModel')?.click()
    await flush()
    expect(prefills).toContain('/model --execute')
    // A scoped row must NOT fall through to the generic /model command.
    expect(runs).not.toContain('model')
  })

  it('runs the bare command for a non-scoped setting (effort)', async () => {
    const { container, runs } = await renderCard()
    molId(container, 'setting-edit-effort')?.click()
    await flush()
    expect(runs).toContain('effort')
  })

  it('reveals each edit affordance via the framework styled Tooltip, never a native title', async () => {
    const { container } = await renderCard()
    // No part of the card uses the delayed, unstyled, touch-blind native title.
    expect(container.querySelector('[title]')).toBeNull()

    const planEdit = molId(container, 'setting-edit-planModel')
    await hover(planEdit)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(
      tooltip,
      'the edit affordance must reveal its command via the styled Tooltip',
    ).not.toBeNull()
    expect(tooltip?.textContent).toContain('/model --plan')
  })

  it('styles via ClassMap theme tokens, never a hardcoded hex in row inline styles', async () => {
    const { container } = await renderCard()
    const card = molId(container, 'settings-card') as HTMLElement
    expect(card.className).not.toContain(classMap.surfaceSecondary)
    expect(card.style.border).toContain('1px solid')
    expect(card.style.border).toContain('--mol-color-primary')
    for (const setting of SETTINGS) {
      const row = molId(container, `setting-row-${setting.id}`) as HTMLElement
      expect(row.getAttribute('style') ?? '', `setting ${setting.id}`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      )
    }
  })

  it('interpolates the host agent name into the descriptions, leaving no raw {{tokens}}', async () => {
    const { container } = await renderCard({ agentName: 'Fable' })
    expect(container.textContent).toContain('Fable')
    expect(container.textContent).not.toContain('{{agentName}}')
  })

  it('marks every command syntax translate=no (it is code, not words)', async () => {
    const { container } = await renderCard()
    const syntax = Array.from(
      container.querySelectorAll('[data-mol-id^="settings-command-"] > code'),
    ) as HTMLElement[]
    expect(syntax.length).toBeGreaterThan(0)
    for (const code of syntax) {
      // The command's argument syntax (`/model [name | --plan ...]`) is never
      // translated — a locale switch leaves it exactly as typed.
      expect(code.getAttribute('translate')).toBe('no')
    }
  })
})
