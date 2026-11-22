/**
 * React's section “Tests status strip” (ChatPanel.tsx lines 8019–8281): the
 * work card above the composer — the plan, the background commands, the tests
 * status strip and the changed-files/commit bar — stacked as chips in one tray.
 *
 * The work card is React's `WorkCard` ({@link WorkCard}) holding the six
 * strips: `PlanCard` for the latest `update_task_list`, `BackgroundTasksStrip`
 * for the executor's detached commands, `TestStatusBar` (or the host's own
 * `nativeTests.renderStatus`) for the project's tests, and a `DockStrip` commit
 * bar whose action slot forks between the green `AutoCommitBadge` and the blue
 * commit button and whose detail lists each changed file with its line counts
 * and its per-file revert control.
 *
 * The whole card is conditional (`workVisible`), so the host is a transparent,
 * always-unwrapped shell (`data-parity-unwrap`, `display: contents`) that the
 * conformance normalizer drops; while React renders nothing the port adds no
 * node either way. The tray is the real root, rendered inside.
 *
 * @module
 */

import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common'
import { Component, inject, TemplateRef, type Type } from '@angular/core'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import type { AutoCommitState, TestItem } from '@molecule/app-ide-panel-logic'
import type { TestsRunState } from '@molecule/app-ide-panel-logic'
import { isAutoCommitEnabled } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { AutoCommitBadge } from '../../parts/auto-commit-badge.component.js'
import { BackgroundTasksStrip } from '../../parts/background-tasks-strip.component.js'
import { DockStrip } from '../../parts/dock-strip.component.js'
import { PlanCard } from '../../parts/plan-card.component.js'
import { TestStatusBar } from '../../parts/test-status-bar.component.js'
import { WorkCard } from '../../parts/work-card.component.js'
import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatGit, type CommitState, type PendingFile } from './chat-git.slice.js'
import type { ChatNativeTests } from './chat-inner-state.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The commit bar's inline styles, serialized the way React writes them. */
const s = {
  /** The scrolling list of changed files. */
  list: styleText({ maxHeight: 200, overflowY: 'auto' }),
  /** A changed file's path cell, truncating with an ellipsis. */
  path: styleText({ overflow: 'hidden', textOverflow: 'ellipsis' }),
  /** The right-hand line counts. */
  counts: styleText({ marginLeft: 'auto', flexShrink: 0, fontSize: 10, opacity: 0.8 }),
  /** Added lines. */
  added: styleText({ color: '#3fb950' }),
  /** Deleted lines. */
  deleted: styleText({ color: '#f85149' }),
} as const

/**
 * React's “Tests status strip” section: the work card above the composer.
 */
@Component({
  selector: 'div[mol-chat-tests-strip]',
  standalone: true,
  imports: [
    NgComponentOutlet,
    NgTemplateOutlet,
    AutoCommitBadge,
    BackgroundTasksStrip,
    DockStrip,
    PlanCard,
    TestStatusBar,
    WorkCard,
  ],
  // prettier-ignore
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `@if (workVisible()) {
  <div mol-work-card>
    <div mol-plan-card [todos]="plan()" [live]="planLive()" [awaitingUser]="planAwaiting()"></div>
    <div mol-background-tasks-strip [tasks]="backgroundTasks()"></div>
    @if (showTests()) {
      @if (nativeTests(); as native) {
        @if (nativeStatusTemplate(); as status) {
          <ng-container [ngTemplateOutlet]="status" [ngTemplateOutletContext]="{ $implicit: openTestsStable, a0: openTestsStable }"></ng-container>
        } @else if (nativeStatusComponent(); as statusComponent) {
          <ng-container [ngComponentOutlet]="statusComponent" [ngComponentOutletInputs]="openerInputs"></ng-container>
        }
      } @else {
        <div mol-test-status-bar [run]="testsRun()" [agentName]="agentName()" [tests]="testsList()" [onOpen]="openTestsStable" [onStop]="stopTests()"></div>
      }
    }
    @if (showFiles()) {
      @if (pendingFiles(); as files) {
      <div mol-dock-strip [molId]="'chat-commit-bar'" [toggleMolId]="'chat-commit-toggle'" [expanded]="commitBarExpanded()" [onToggle]="toggleCommitBar" [hideLabel]="true" [label]="showChangedFilesLabel()" [actions]="commitActionsTpl">
        <div [attr.style]="s.list">
          @for (file of files; track file.path) {
            <button type="button" [class]="cm.textMuted" [attr.style]="rowStyle()" (click)="openDiff(file.path)" (mouseenter)="rowEnter($event)" (mouseleave)="rowLeave($event)">
              <span [attr.style]="s.path">{{ file.path }}</span>
              @if (file.additions || file.deletions) {
                <span [attr.style]="s.counts">
                  @if (file.additions) {<span [attr.style]="s.added">+{{ file.additions }}</span>}
                  @if (file.additions && file.deletions) {{{ ' ' }}}
                  @if (file.deletions) {<span [attr.style]="s.deleted">-{{ file.deletions }}</span>}
                </span>
              }
              @if (hasFileRevert()) {
                <span role="button" tabindex="0" [attr.title]="revertFileLabel()" (click)="revertFile($event, file)" (keydown)="revertKeydown($event, file)" (mouseenter)="revertEnter($event)" (mouseleave)="revertLeave($event)" [attr.style]="revertStyle(file)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path></svg>
                </span>
              }
            </button>
          }
        </div>
      </div>
      }
    }
  </div>
}
<ng-template #commitActionsTpl>@if (autoCommitBadge()) {<div mol-auto-commit-badge [state]="autoCommit()" [label]="commitFileCountLabel()" [disabled]="autoCommitHeld()" [onCommitNow]="commitNow" [inline]="true"></div>} @else {<button type="button" data-mol-id="chat-commit-button" [attr.disabled]="commitBusy() ? '' : null" [class]="commitButtonClass()" (click)="commitClick($event)">{{ commitButtonText() }}</button>}</ng-template>`,
})
export class ChatTestsStrip {
  /** The shared state, read for the env, the props and the injected slices. */
  private readonly state = inject(ChatInnerState)

  /** The timeline slice: the plan, the tests/files visibility and the card gate. */
  private readonly timeline = inject(ChatTimeline)

  /** The git slice: the pending files, the in-flight commit and the commit action. */
  private readonly git = inject(ChatGit)

  /** The auto-commit slice: the countdown and its hold. */
  private readonly autoCommitSlice = inject(ChatAutoCommit)

  /** The tests slice: the run, the listing and the browser opener. */
  private readonly tests = inject(ChatTests)

  /** The chat slice: the executor's detached background commands. */
  private readonly chat = inject(ChatChat)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The commit bar's constant inline styles. */
  protected readonly s = s

  /** Whether the work card is shown (popups hide it). */
  protected readonly workVisible = this.timeline.workVisible

  /** The latest task list (the plan strip's rows). */
  protected readonly plan = this.timeline.plan

  /** Whether a turn is running (a plan step spins). */
  protected readonly planLive = this.timeline.planLive

  /** Whether the plan is waiting on the person. */
  protected readonly planAwaiting = this.timeline.planAwaiting

  /** Whether the tests status strip is shown. */
  protected readonly showTests = this.timeline.showTests

  /** Whether the changed-files strip is shown. */
  protected readonly showFiles = this.timeline.showFiles

  /**
   * The inputs a host status-strip COMPONENT receives: the panel's browser
   * opener under the React prop's name.
   */
  protected readonly openerInputs = { open: (): void => this.openTestsStable() }

  /**
   * Opens the tests browser (a stable callback, as React's committed one is).
   */
  protected readonly openTestsStable = (): void => {
    this.state.slice(ChatTests).openTestsBrowser('')
  }

  /** The executor's detached background commands, newest last. */
  protected backgroundTasks(): BackgroundTaskState[] {
    return this.chat.backgroundTasks()
  }

  /** The auto-commit state machine's state. */
  protected autoCommit(): AutoCommitState {
    return this.autoCommitSlice.autoCommit()
  }

  /** Whether auto-commit must hold (a turn or an auto-fix countdown is active). */
  protected autoCommitHeld(): boolean {
    return this.autoCommitSlice.autoCommitHeld()
  }

  /** The live run state. */
  protected testsRun(): TestsRunState {
    return this.tests.testsRun()
  }

  /** The discovered tests. */
  protected testsList(): TestItem[] {
    return this.tests.testsList()
  }

  /** The host's own durable test-history surface, when the host wired one. */
  protected nativeTests(): ChatNativeTests | undefined {
    return this.state.props().nativeTests
  }

  /**
   * The host's status strip as a template, when it passed one (the conformance
   * kit materializes a render function as a template whose `a0` is the opener).
   *
   * @returns The template, or null when the host passed a component instead.
   */
  protected nativeStatusTemplate(): TemplateRef<{ $implicit: () => void; a0: () => void }> | null {
    const status = this.nativeTests()?.renderStatus
    return status instanceof TemplateRef ? status : null
  }

  /**
   * The host's status strip as an Angular component, when it passed one.
   *
   * @returns The component type, or null when the host passed a template.
   */
  protected nativeStatusComponent(): Type<unknown> | null {
    const status = this.nativeTests()?.renderStatus
    return typeof status === 'function' ? status : null
  }

  /** The agent's display name, for a run the agent started. */
  protected agentName(): string | undefined {
    return this.state.props().agentName
  }

  /** The uncommitted files, or null before the first status arrives. */
  protected pendingFiles(): PendingFile[] | null {
    return this.git.pendingFiles()
  }

  /** Whether the commit bar's file list is expanded. */
  protected commitBarExpanded(): boolean {
    return this.git.commitBarExpanded()
  }

  /** The commit bar's in-flight outcome, or null. */
  protected commitState(): CommitState | null {
    return this.git.commitState()
  }

  /** Whether the per-file revert control renders (the host wired a revert). */
  protected hasFileRevert(): boolean {
    return this.state.props().onFileRevert != null
  }

  /** Flips the commit bar's disclosure (this strip's standalone toggle). */
  protected readonly toggleCommitBar = (): void => {
    this.git.setCommitBarExpanded((expanded) => !expanded)
  }

  /** The Stop control's handler: a run in flight the host can stop. */
  protected stopTests(): (() => void) | undefined {
    const run = this.tests.testsRun()
    if (!run.running || run.external) return undefined
    return () => this.tests.cancelTestsRun()
  }

  /** The commit bar's label (React's `Show changed files`). */
  protected showChangedFilesLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.showChangedFiles', undefined, {
      defaultValue: 'Show changed files',
    })
  }

  /** The translated "Commit N files" label the badge and the blue button wear. */
  protected commitFileCountLabel(): string {
    void this.state.env.locale()
    const count = this.git.pendingFiles()?.length ?? 0
    return this.state.env.t(
      'ide.chat.commitFileCount',
      { count },
      {
        count,
        defaultValue: 'Commit {{count}} files',
        defaultValue_one: 'Commit {{count}} file',
      },
    )
  }

  /**
   * Whether the green auto-commit badge occupies the action slot instead of the
   * blue commit button (React's condition, verbatim).
   */
  protected autoCommitBadge(): boolean {
    const status = this.git.commitState()?.status
    return (
      isAutoCommitEnabled(this.autoCommitSlice.autoCommit()) &&
      status !== 'committing' &&
      status !== 'committed'
    )
  }

  /** Whether the blue commit button is disabled while a commit or turn runs. */
  protected commitBusy(): boolean {
    const status = this.git.commitState()?.status
    return (
      status === 'committing' || status === 'committed' || this.autoCommitSlice.autoCommitHeld()
    )
  }

  /** The blue commit button's classes: the design system's primary `xs` action. */
  protected commitButtonClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /** The blue commit button's text: its status, or the file count. */
  protected commitButtonText(): string {
    void this.state.env.locale()
    const status = this.git.commitState()?.status
    if (status === 'committing') {
      return this.state.env.t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
    }
    if (status === 'committed') {
      return this.state.env.t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
    }
    return this.commitFileCountLabel()
  }

  /** Commits now from the green badge, pausing the countdown first. */
  protected readonly commitNow = (): void => {
    this.autoCommitSlice.dispatchAutoCommit({ type: 'fired' })
    void this.git.handleCommit()
  }

  /**
   * Acts on a blue-button press the way React's handler does: never while busy,
   * and never letting the click bubble to the commit-bar chip's toggle.
   *
   * @param event - The click event.
   */
  protected commitClick(event: MouseEvent): void {
    event.stopPropagation()
    if (this.commitBusy()) return
    void this.git.handleCommit()
  }

  /** The revert control's tooltip. */
  protected revertFileLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.revertFile', undefined, {
      defaultValue: 'Revert to last commit',
    })
  }

  /** A changed-file row's inline style (the row layout React writes). */
  protected rowStyle(): string | null {
    const coarse = this.state.env.isCoarse()
    const canDiff = this.state.props().onFileDiff != null
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'none',
      border: 'none',
      padding: '1px 0',
      ...(coarse ? { minHeight: 32 } : {}),
      cursor: canDiff ? 'pointer' : 'default',
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 11,
      color: 'inherit',
      opacity: 0.7,
      textAlign: 'left',
      width: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    })
  }

  /** A changed-file row's per-file revert control's inline style. */
  protected revertStyle(file: PendingFile): string | null {
    const coarse = this.state.env.isCoarse()
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: coarse ? 32 : 18,
      height: coarse ? 32 : 18,
      borderRadius: 3,
      flexShrink: 0,
      cursor: 'pointer',
      opacity: 0.5,
      transition: 'opacity 100ms, background 100ms',
      ...(!(file.additions || file.deletions) ? { marginLeft: 'auto' } : {}),
    })
  }

  /**
   * Opens a changed file's diff.
   *
   * @param path - The file's workspace-relative path.
   */
  protected openDiff(path: string): void {
    this.state.props().onFileDiff?.(path)
  }

  /**
   * Tints a changed-file row with the theme's primary token on hover.
   *
   * @param event - The mouse event (its currentTarget is the row button).
   */
  protected rowEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.color = 'var(--mol-color-primary, #4070e0)'
  }

  /**
   * Clears the hover tint.
   *
   * @param event - The mouse event (its currentTarget is the row button).
   */
  protected rowLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.color = ''
  }

  /**
   * Highlights the per-file revert control on hover.
   *
   * @param event - The mouse event (its currentTarget is the revert span).
   */
  protected revertEnter(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'rgba(128,128,128,0.2)'
    element.style.opacity = '1'
  }

  /**
   * Restores the per-file revert control's resting look.
   *
   * @param event - The mouse event (its currentTarget is the revert span).
   */
  protected revertLeave(event: Event): void {
    const element = event.currentTarget as HTMLElement
    element.style.background = 'transparent'
    element.style.opacity = '0.5'
  }

  /**
   * Turns Enter or Space on the revert control into its click.
   *
   * @param event - The keydown.
   * @param file - The row's changed file.
   */
  protected revertKeydown(event: KeyboardEvent, file: PendingFile): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    this.revertFile(event, file)
  }

  /**
   * Reverts one changed file to its last committed state, then refreshes the
   * status and (for a new file that was deleted) tells the host, or re-reads the
   * file's content so an open editor shows it.
   *
   * @param event - The click or keydown.
   * @param file - The row's changed file.
   */
  protected revertFile(event: Event, file: PendingFile): void {
    event.stopPropagation()
    const http = this.state.env.http
    const projectId = this.state.props().projectId
    http
      .post(`/projects/${projectId}/git-revert`, { path: file.path })
      .then(() => {
        this.git.refreshGitStatus()
        // Refresh the editor if the file is open — fetch fresh content for a
        // modified/restored file, or close it if a new file got deleted.
        if (file.status === 'untracked' || file.status === 'added') {
          this.state.props().onFileDeleted?.(file.path)
        } else {
          http
            .get<{ content: string }>(`/projects/${projectId}/files/${file.path}`)
            .then((res) => this.state.props().onFileChange?.(file.path, res.data.content))
            .catch((error: unknown) => {
              logger.warn(
                `chat-panel: refreshing open file "${file.path}" after revert failed; editor shows pre-revert content`,
                { error },
              )
            })
        }
      })
      .catch((error: unknown) => {
        logger.warn(`chat-panel: git revert of "${file.path}" failed; file list unchanged`, {
          error,
        })
      })
  }
}
