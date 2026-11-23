/**
 * The commands running in the sandbox that outlived the tool call that started
 * them — the strip above the composer naming each one, how long it has been
 * running, and how it ended.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `BackgroundTasksStrip`
 * (see that file for the design notes): the same inputs (React prop names),
 * the same DOM for the same input, the same callbacks. The rows render over
 * the shared `DockStrip` chrome ({@link DockStrip}, whose standalone branch
 * draws the strip) with the shared `StatusMark` icon — the platform's molecule
 * spinner while a command is running, a red crossed circle when failed, a
 * still ring when cancelled, the check circle when done. While a command runs
 * a once-a-second tick re-renders the strip so its elapsed time counts up, and
 * the tick is torn down and re-armed whenever the running count changes, the
 * way React's effect re-subscribes.
 *
 * React's component renders the strip as its root, with no wrapper of its own,
 * and renders nothing when there are no tasks: the template's nodes render in
 * front of the host (`placeContentBefore`) and the host leaves the DOM, so the
 * DOM is React's, with no shell element. Inputs
 * are declared the way the kit's other Angular feature components declare
 * them — one plain field per React prop, named in the decorator's `inputs`
 * array — and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render
 * does. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express, serialized through `styleText` the way
 * React writes numbers (`8` → `8px`). The component is a part (React renders
 * it inside ChatPanel without exporting it), so it lives in `src/parts/` and
 * is exported under the React name.
 *
 * @module
 */

import type { DoCheck } from '@angular/core'
import { Component, effect, ElementRef, inject, signal } from '@angular/core'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { DockStrip, StatusMark, type StatusMarkState } from './dock-strip.component.js'

/** Props for {@link BackgroundTasksStrip} — the React prop names, React's own contract. */
export interface BackgroundTasksStripProps {
  /** Every background command of the current turn, newest last. */
  tasks: BackgroundTaskState[]
}

/** The strip's constant inline styles, serialized once through `styleText`. */
const s = {
  /** The task list itself. */
  list: styleText({ listStyle: 'none', margin: 0, padding: 0 }),
  /** One task row (the padding spells React's DOM: `3px 0px`). */
  row: styleText({ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0px' }),
  /** The mark column before each row's text. */
  markSlot: styleText({ flexShrink: 0, display: 'inline-flex', paddingTop: 1 }),
  /** The row's text block: purpose, output, command (`flex: 1` as React's DOM writes it). */
  body: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** The raw command under a described task. */
  command: styleText({ display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }),
  /** The right-hand status: how long it ran, and how it ended. */
  describe: styleText({ flexShrink: 0, whiteSpace: 'nowrap' }),
} as const

/**
 * What a task is for: the executor's own reason, else the command itself.
 *
 * @param task - The background task.
 * @returns The purpose text.
 */
function purpose(task: BackgroundTaskState): string {
  return task.description ?? task.command
}

/**
 * The strip listing the sandbox's detached commands. React renders it inside
 * ChatPanel under the React name `BackgroundTasksStrip`.
 */
@Component({
  selector: 'div[mol-background-tasks-strip]',
  standalone: true,
  imports: [DockStrip, StatusMark],
  inputs: ['tasks'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (tasks.length > 0) {
  <div mol-dock-strip [molId]="'chat-background-tasks'" [toggleMolId]="'chat-background-tasks-toggle'" [expanded]="expanded()" [onToggle]="toggleExpanded" [icon]="iconTpl" [label]="label()" [chipLabel]="chip()" [chipTitle]="chipTitle() ?? undefined" [hint]="hint() ?? undefined">
    <ul [attr.style]="s.list">
      @for (task of tickedList(); track task.id) {
        <li data-mol-id="chat-background-task" [class]="cm.textSize('xs')" [attr.style]="s.row">
          <span [attr.style]="s.markSlot"><span mol-dock-strip-status-mark [state]="rowMark(task)" [size]="14"></span></span>
          <div [attr.style]="s.body">
            <div>{{ purpose(task) }}</div>
            @if (progressOf(task); as taskProgress) {<div [class]="cm.textMuted">{{ taskProgress }}</div>}
            @if (task.description) {<code [class]="cm.textMuted" [attr.style]="s.command">{{ task.command }}</code>}
          </div>
          <span [class]="cm.textMuted" [attr.style]="s.describe">{{ describe(task) }}</span>
        </li>
      }
    </ul>
  </div>
}
<ng-template #iconTpl><span mol-dock-strip-status-mark [state]="headerMark()" [size]="14"></span></ng-template>`,
})
export class BackgroundTasksStrip implements DoCheck {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Every background command of the current turn, newest last. */
  tasks: BackgroundTaskState[] = []

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function; its calls re-run the view on a locale switch. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  private readonly locale = this.i18n.locale

  /** Whether the strip's detail is shown (React's `useState(false)` initial). */
  protected readonly expanded = signal(false)

  /** The strip's constant inline styles. */
  protected readonly s = s

  /**
   * React's `useState(0)` seed: the once-a-second counter the elapsed times
   * read through, so a tick redraws them the way React's re-render does.
   */
  protected readonly tick = signal(0)

  /**
   * The running count as a signal, mirrored from the plain `tasks` input each
   * change-detection pass — the dependency React's effect subscribes to.
   */
  private readonly runningCount = signal(0)

  constructor() {
    // React's root is the strip div (or nothing): the template's nodes render in
    // front of the host and the host stays out of the DOM.
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
    // React's effect tears down and re-arms the interval on every
    // running-count change, so a new command restarts the phase from that
    // moment, and nothing ticks once the last command has ended.
    effect(() => {
      const count = this.runningCount()
      if (count === 0) return
      const timer = setInterval(() => this.tick.update((n) => n + 1), 1000)
      return () => clearInterval(timer)
    })
  }

  /** Keeps the running-count mirror in step with the `tasks` input. */
  ngDoCheck(): void {
    const count = this.tasks.filter((task) => task.status === 'running').length
    if (this.runningCount() !== count) this.runningCount.set(count)
  }

  /**
   * Flips the detail, the way React's disclosure toggle does. An arrow field:
   * the strip receives the function through an input, so it must keep its
   * `this`.
   */
  protected readonly toggleExpanded = (): void => {
    this.expanded.set(!this.expanded())
  }

  /**
   * The list the rows render, read through the tick: every row's elapsed time
   * re-computes on a tick the way React's whole render does.
   *
   * @returns The tasks.
   */
  protected tickedList(): BackgroundTaskState[] {
    void this.tick()
    return this.tasks
  }

  /**
   * The strip's label: the summary line naming how many commands are in each
   * state (running outranks failed, failed outranks a cancelled-only batch,
   * and anything else reads as finished).
   *
   * @returns The translated summary.
   */
  protected label(): string {
    const running = this.tasks.filter((task) => task.status === 'running')
    const failed = this.tasks.filter((task) => task.status === 'failed')
    const cancelled = this.tasks.filter((task) => task.status === 'cancelled')
    if (running.length > 0) {
      return this.t(
        'ide.chat.backgroundRunning',
        { count: running.length },
        { defaultValue: '{{count}} task running in the background' },
      )
    }
    if (failed.length > 0) {
      return this.t(
        'ide.chat.backgroundFailed',
        { count: failed.length },
        { defaultValue: '{{count}} background task failed' },
      )
    }
    if (cancelled.length === this.tasks.length) {
      return this.t(
        'ide.chat.backgroundCancelled',
        { count: cancelled.length },
        {
          defaultValue: '{{count}} background task cancelled',
        },
      )
    }
    return this.t(
      'ide.chat.backgroundDone',
      { count: this.tasks.length },
      { defaultValue: '{{count}} background task finished' },
    )
  }

  /** The tray chip's tally, with the same precedence as the summary. */
  protected chip(): string {
    const running = this.tasks.filter((task) => task.status === 'running')
    const failed = this.tasks.filter((task) => task.status === 'failed')
    const cancelled = this.tasks.filter((task) => task.status === 'cancelled')
    if (running.length > 0) {
      return this.t(
        'ide.work.running',
        { count: running.length },
        { defaultValue: '{{count}} running' },
      )
    }
    if (failed.length > 0) {
      return this.t(
        'ide.work.failed',
        { count: failed.length },
        { defaultValue: '{{count}} failed' },
      )
    }
    if (cancelled.length === this.tasks.length) {
      return this.t(
        'ide.work.cancelled',
        { count: cancelled.length },
        { defaultValue: '{{count}} cancelled' },
      )
    }
    return this.t(
      'ide.work.finishedCount',
      { count: this.tasks.length },
      { defaultValue: '{{count}} finished' },
    )
  }

  /**
   * The header's mark: the spinner while a command runs, crossed red when one
   * failed, a still ring when the batch is all cancelled, the check circle
   * otherwise.
   *
   * @returns The mark's state.
   */
  protected headerMark(): StatusMarkState {
    const running = this.tasks.filter((task) => task.status === 'running')
    const failed = this.tasks.filter((task) => task.status === 'failed')
    const cancelled = this.tasks.filter((task) => task.status === 'cancelled')
    if (running.length > 0) return 'active'
    if (failed.length > 0) return 'failed'
    if (cancelled.length === this.tasks.length) return 'stopped'
    return 'done'
  }

  /**
   * The task the collapsed header names: the purpose of the task in flight —
   * the first running one, else the first failed, else the first cancelled.
   *
   * @returns The task, or undefined when none is running, failed or cancelled.
   */
  private lead(): BackgroundTaskState | undefined {
    return (
      this.tasks.find((task) => task.status === 'running') ??
      this.tasks.find((task) => task.status === 'failed') ??
      this.tasks.find((task) => task.status === 'cancelled')
    )
  }

  /**
   * The tray chip's hover text: the task in flight's purpose.
   *
   * @returns The chip title, or undefined when nothing is in flight.
   */
  protected chipTitle(): string | undefined {
    const first = this.lead()
    return first ? purpose(first) : undefined
  }

  /**
   * The collapsed header's hint: the task in flight's purpose, and its
   * measured output when there is any.
   *
   * @returns The hint text, or undefined when expanded or nothing is in flight.
   */
  protected hint(): string | undefined {
    const first = this.lead()
    if (this.expanded() || !first) return undefined
    const leadProgress = this.progressOf(first)
    return `· ${purpose(first)}${leadProgress ? ` · ${leadProgress}` : ''}`
  }

  /**
   * A row mark's state: spinner while running, crossed red when failed, a
   * still ring when cancelled, the check circle when done.
   *
   * @param task - The row's task.
   * @returns The mark's state.
   */
  protected rowMark(task: BackgroundTaskState): StatusMarkState {
    if (task.status === 'running') return 'active'
    if (task.status === 'failed') return 'failed'
    if (task.status === 'cancelled') return 'stopped'
    return 'done'
  }

  /**
   * What a task is for, for the template: the executor's own reason, else the
   * command itself.
   *
   * @param task - The row's task.
   * @returns The purpose text.
   */
  protected purpose(task: BackgroundTaskState): string {
    return purpose(task)
  }

  /**
   * A worker's observed output is useful progress without inventing a total
   * or percentage.
   *
   * @param task - The row's task.
   * @returns The progress text, or undefined when no output has been observed.
   */
  protected progressOf(task: BackgroundTaskState): string | undefined {
    if (task.outputChars == null) return undefined
    return this.t(
      'ide.chat.backgroundOutput',
      { count: task.outputChars.toLocaleString() },
      {
        defaultValue: '{{count}} characters produced',
      },
    )
  }

  /**
   * The right-hand status for one command: how long it ran, and how it ended.
   * Read through the tick (every call site re-renders on a tick), so a
   * running command's seconds count up.
   *
   * @param task - The row's task.
   * @returns The status text.
   */
  protected describe(task: BackgroundTaskState): string {
    void this.tick()
    void this.locale()
    const seconds = Math.max(
      0,
      Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000),
    )
    const elapsed = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    if (task.status === 'running') {
      return this.t(
        'ide.chat.backgroundElapsed',
        { elapsed },
        { defaultValue: 'running · {{elapsed}}' },
      )
    }
    if (task.status === 'failed') {
      return this.t(
        'ide.chat.backgroundExit',
        { code: task.exitCode ?? 1, elapsed },
        { defaultValue: 'exit {{code}} · {{elapsed}}' },
      )
    }
    if (task.status === 'cancelled') {
      return this.t(
        'ide.chat.backgroundCancelledElapsed',
        { elapsed },
        { defaultValue: 'cancelled · {{elapsed}}' },
      )
    }
    return this.t('ide.chat.backgroundOk', { elapsed }, { defaultValue: 'done · {{elapsed}}' })
  }
}
