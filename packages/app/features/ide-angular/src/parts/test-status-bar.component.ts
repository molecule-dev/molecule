/**
 * The tests status bar — a collapsed strip above the commit bar saying how the
 * project's tests stand, and what is running right now.
 *
 * The summary stays visible while the tests browser is closed, so the person
 * can follow a run and reopen its results from the composer.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `TestStatusBar` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The bar borrows the commit bar's
 * chrome through the shared {@link DockStrip} (whose standalone branch draws
 * the strip) with the shared `StatusMark` icon; the summary opens the tests
 * browser directly (`onActivate`), so there is no intermediate disclosure. The
 * deprecated `expanded`/`onToggle` inputs are accepted and ignored the way
 * React's are.
 *
 * React's component renders the strip as its root, with no wrapper of its own,
 * so the template's nodes render in front of the host (`placeContentBefore`)
 * and the host leaves the DOM: the DOM is React's, with no shell element.
 * Inputs
 * are declared the way the kit's other Angular feature components declare
 * them — one plain field per React prop, named in the decorator's `inputs`
 * array — and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render
 * does. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express. All user-facing text goes through `t()`.
 * The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/` and is exported under the React
 * name.
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import type { TestsBarSummary, TestsBarTone } from '@molecule/app-ide-panel-logic/panels'
import {
  runningLabel,
  summariseTestsBar,
  testsBarLabel,
  testsChipLabel,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark, type StatusMarkState } from './dock-strip.component.js'

/** The shared status mark each tone wears on the chip. */
const TONE_MARK: Record<TestsBarTone, StatusMarkState> = {
  idle: 'todo',
  running: 'active',
  passing: 'done',
  failing: 'failed',
  stopped: 'stopped',
  error: 'failed',
}

/** Props for {@link TestStatusBar} — the React prop names, React's own contract. */
export interface TestStatusBarProps {
  /** The live run state. */
  run: TestsRunState
  /** The discovered tests, for naming the file that is running. */
  tests: TestItem[]
  /**
   * Legacy expansion state.
   * @deprecated The summary opens the tests browser directly.
   */
  expanded?: boolean
  /**
   * Legacy disclosure callback.
   * @deprecated The summary opens the tests browser directly.
   */
  onToggle?: () => void
  /** Open the tests browser (the `/test` card) — the place runs are started. */
  onOpen: () => void
  /** Stop the run in flight, when one is running. */
  onStop?: (() => void) | undefined
  /** The agent's display name, for a run the agent started. */
  agentName?: string
}

/**
 * Renders the tests status strip. React renders it inside ChatPanel under the
 * React name `TestStatusBar`.
 */
@Component({
  selector: 'div[mol-test-status-bar]',
  standalone: true,
  imports: [DockStrip, StatusMark],
  inputs: ['run', 'tests', 'expanded', 'onToggle', 'onOpen', 'onStop', 'agentName'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div mol-dock-strip [molId]="'tests-bar'" [toggleMolId]="'tests-bar-toggle'" [expanded]="false" [onToggle]="onOpen" [onActivate]="onOpen" [icon]="iconTpl" [label]="labelTpl" [hint]="showHint() ? hintTpl : undefined" [actions]="showStop() ? actionsTpl : undefined" [chipLabel]="chipText()" [rootProps]="rootProps()"></div>
<ng-template #labelTpl><span data-mol-id="tests-bar-label">{{ labelText() }}</span></ng-template>
<ng-template #hintTpl><span data-mol-id="tests-bar-current">{{ '· ' + hintText() }}</span></ng-template>
<ng-template #iconTpl><span mol-dock-strip-status-mark [state]="markState()" [size]="14"></span></ng-template>
<ng-template #actionsTpl><button type="button" data-mol-id="tests-bar-stop" [class]="stopClasses()" (click)="stopClick($event)">{{ stopLabel() }}</button></ng-template>`,
})
export class TestStatusBar {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the template's nodes in front of the host and keeps the host out of
   * the DOM: React's root is the strip element itself.
   */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The live run state. */
  run: TestsRunState | undefined

  /** The discovered tests, for naming the file that is running. */
  tests: TestItem[] | undefined

  /**
   * Legacy expansion state.
   * @deprecated The summary opens the tests browser directly.
   */
  expanded?: boolean

  /**
   * Legacy disclosure callback.
   * @deprecated The summary opens the tests browser directly.
   */
  onToggle?: () => void

  /** Open the tests browser (the `/test` card) — the place runs are started. */
  onOpen!: () => void

  /** Stop the run in flight, when one is running. */
  onStop?: (() => void) | undefined

  /** The agent's display name, for a run the agent started. */
  agentName?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function; its calls re-run the view on a locale switch. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  private readonly locale = this.i18n.locale

  /**
   * Everything the bar shows, derived from the run state — the panel-logic
   * helper React's own render calls, so the derivation cannot drift.
   *
   * @returns The run summary.
   */
  protected summary(): TestsBarSummary {
    return summariseTestsBar(this.run as TestsRunState, this.tests ?? [])
  }

  /**
   * The one-line summary: a run this panel only watches says who started it,
   * the rest count the files.
   *
   * @returns The translated label.
   */
  protected labelText(): string {
    void this.locale()
    const run = this.run as TestsRunState
    const summary = this.summary()
    return run.running && run.external
      ? runningLabel(this.t, run, this.agentName)
      : testsBarLabel(this.t, summary)
  }

  /**
   * The short label the tray chip wears; full details live in the tests
   * browser.
   *
   * @returns The translated chip label.
   */
  protected chipText(): string {
    void this.locale()
    const run = this.run as TestsRunState
    return run.running && run.external ? this.labelText() : testsChipLabel(this.t, this.summary())
  }

  /**
   * What is in flight right now: the test on screen, else its file, else the
   * command an outside run is on.
   *
   * @returns The text, or undefined when nothing is in flight.
   */
  protected hintText(): string {
    const summary = this.summary()
    const run = this.run as TestsRunState
    return summary.currentTest ?? summary.currentFile ?? run.command ?? ''
  }

  /**
   * Whether the quieter hint renders at all: while the run is going, with
   * something to name.
   *
   * @returns True when the hint renders.
   */
  protected showHint(): boolean {
    return this.summary().tone === 'running' && !!this.hintText()
  }

  /**
   * Whether the Stop control renders: a run in flight AND a host that serves
   * stopping.
   *
   * @returns True when the Stop control renders.
   */
  protected showStop(): boolean {
    const run = this.run as TestsRunState
    return run.running && this.onStop != null
  }

  /**
   * The status mark's state for the run's tone.
   *
   * @returns The mark's state.
   */
  protected markState(): StatusMarkState {
    return TONE_MARK[this.summary().tone]
  }

  /**
   * The strip's root attributes: the run's tone, for the host's own styling.
   *
   * @returns The extra attributes.
   */
  protected rootProps(): Record<string, string> {
    return { 'data-tests-tone': this.summary().tone }
  }

  /**
   * The Stop button's classes: the design system's destructive action, at the
   * bar's `xs` scale, compact.
   *
   * @returns The resolved class string.
   */
  protected stopClasses(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The Stop button's text.
   *
   * @returns The translated label.
   */
  protected stopLabel(): string {
    void this.locale()
    return this.t('ide.testsBar.stop', undefined, { defaultValue: 'Stop' })
  }

  /**
   * Acts on a Stop press the way React's handler does: the strip's own
   * disclosure never hears it, and the run is asked to stop.
   *
   * @param event - The click event.
   */
  protected stopClick(event: Event): void {
    event.stopPropagation()
    this.onStop?.()
  }
}
