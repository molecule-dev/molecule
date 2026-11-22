/**
 * The work card: the plan, the background tasks, the tests status bar and the
 * commit bar, rendered as one stack above the composer.
 *
 * The tests strip sits directly above the commit bar and wears its chrome, so
 * the two read as one stack. It shows by default and renders for a VIEWER too
 * (watching is not editing); the commit bar does not (committing is editor
 * work). Popups hide the whole card. A project with no tests yet gets no tests
 * bar — it appears on its own as soon as discovery finds the first spec.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, Show } from 'solid-js'

import { isAutoCommitEnabled } from '@molecule/app-ide-panel-logic'

import { AutoCommitBadge } from '../../parts/AutoCommitBadge.jsx'
import { BackgroundTasksStrip } from '../../parts/BackgroundTasksStrip.jsx'
import { DockStrip } from '../../parts/DockStrip.jsx'
import { PlanCard } from '../../parts/PlanCard.jsx'
import { TestStatusBar } from '../../parts/TestStatusBar.jsx'
import { WorkCard } from '../../parts/WorkCard.jsx'
import type { ChatInnerCtx } from './context.js'
import type { PendingFileEntry } from './create-chat-git.js'

/** Props for {@link ChatTestsStrip}. */
export interface ChatTestsStripProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the tests status strip (the work card).
 * @param props - The inner ctx.
 * @returns The work card, or nothing when it would show no section.
 */
export function ChatTestsStrip(props: ChatTestsStripProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const t = ctx.env.t

  /** The pending files when the strip shows, else null. */
  const pendingFilesForBar = createMemo<PendingFileEntry[] | null>(() =>
    ctx.timeline.showFiles() ? ctx.git.pendingFiles() : null,
  )

  /** The commit's label, with React's plural forms. */
  const commitFileLabel = (count: number): string =>
    t(
      'ide.chat.commitFileCount',
      { count },
      {
        count,
        defaultValue: 'Commit {{count}} files',
        defaultValue_one: 'Commit {{count}} file',
      },
    )

  /** Whether the commit action is busy (committing, committed or held). */
  const commitBusy = (): boolean => {
    const status = ctx.git.commitState()?.status
    return status === 'committing' || status === 'committed' || ctx.autoCommit.autoCommitHeld()
  }

  /** Whether the green auto-commit badge occupies the action slot. */
  const autoCommitBadgeShown = (): boolean => {
    const status = ctx.git.commitState()?.status
    return (
      isAutoCommitEnabled(ctx.autoCommit.autoCommit()) &&
      status !== 'committing' &&
      status !== 'committed'
    )
  }

  /** The plain blue commit button the action slot shows when auto-commit is off. */
  const renderCommitButton = (files: () => PendingFileEntry[]): JSX.Element => (
    <button
      type="button"
      data-mol-id="chat-commit-button"
      onClick={(event) => {
        event.stopPropagation()
        if (commitBusy()) return
        void ctx.git.handleCommit()
      }}
      disabled={commitBusy()}
      class={cm.cn(
        cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
        cm.touchTargetCompact,
      )}
    >
      {ctx.git.commitState()?.status === 'committing'
        ? t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
        : ctx.git.commitState()?.status === 'committed'
          ? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
          : commitFileLabel(files().length)}
    </button>
  )

  /** The strip's right-hand action slot. */
  const renderActions = (files: () => PendingFileEntry[]): JSX.Element =>
    autoCommitBadgeShown() ? (
      <AutoCommitBadge
        state={ctx.autoCommit.autoCommit()}
        label={commitFileLabel(files().length)}
        disabled={ctx.autoCommit.autoCommitHeld()}
        onCommitNow={() => {
          // Pause the countdown before committing so a due auto-fire does not
          // race the manual commit onto a freshly clean tree.
          ctx.autoCommit.dispatchAutoCommit({ type: 'fired' })
          void ctx.git.handleCommit()
        }}
        inline
      />
    ) : (
      renderCommitButton(files)
    )

  /**
   * A changed-file row's inline style. Read through a call (not an inline
   * object literal) so every property is applied through the CSSOM at runtime,
   * the way React's `style` prop is — a static literal is hoisted into the
   * template attribute, where a shorthand like `background` round-trips
   * differently under jsdom.
   *
   * @param file - The row's pending file (its counts place the revert control).
   * @param hasDiff - Whether clicking the row opens a diff (so it is clickable).
   * @returns The row button's inline style fields.
   */
  const rowButtonStyle = (file: PendingFileEntry, hasDiff: boolean): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    padding: '1px 0',
    ...(ctx.env.isCoarse() ? { 'min-height': '32px' } : {}),
    cursor: hasDiff ? 'pointer' : 'default',
    'font-family': "'SF Mono', 'Fira Code', monospace",
    'font-size': '11px',
    color: 'inherit',
    opacity: '0.7',
    'text-align': 'left',
    width: '100%',
    overflow: 'hidden',
    'white-space': 'nowrap',
  })

  /**
   * The per-file revert control's inline style. Called, not an inline literal,
   * for the same CSSOM round-trip reason as {@link rowButtonStyle}.
   *
   * @param file - The row's pending file (a row with counts leaves the control
   *   after them; one without pushes it to the row's end).
   * @returns The revert control's inline style fields.
   */
  const revertControlStyle = (file: PendingFileEntry): Record<string, string> => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    // Touch: 32px hit box (dense-row floor); glyph unchanged.
    width: ctx.env.isCoarse() ? '32px' : '18px',
    height: ctx.env.isCoarse() ? '32px' : '18px',
    'border-radius': '3px',
    'flex-shrink': '0',
    cursor: 'pointer',
    opacity: '0.5',
    transition: 'opacity 100ms, background 100ms',
    ...(!(file.additions || file.deletions) ? { 'margin-left': 'auto' } : {}),
  })

  /** The open strip's changed-file rows. */
  const renderFileList = (files: () => PendingFileEntry[]): JSX.Element => (
    <div style={{ 'max-height': '200px', 'overflow-y': 'auto' }}>
      {files().map((f) => (
        <button
          type="button"
          onClick={() => ctx.props.onFileDiff?.(f.path)}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--mol-color-primary, #4070e0)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = ''
          }}
          style={rowButtonStyle(f, Boolean(ctx.props.onFileDiff))}
          class={cm.textMuted}
        >
          <span style={{ overflow: 'hidden', 'text-overflow': 'ellipsis' }}>{f.path}</span>
          {!!(f.additions || f.deletions) && (
            <span
              style={{
                'margin-left': 'auto',
                'flex-shrink': '0',
                'font-size': '10px',
                opacity: '0.8',
              }}
            >
              {!!f.additions && <span style={{ color: '#3fb950' }}>+{f.additions}</span>}
              {!!f.additions && !!f.deletions && ' '}
              {!!f.deletions && <span style={{ color: '#f85149' }}>-{f.deletions}</span>}
            </span>
          )}
          {ctx.props.onFileRevert && (
            <span
              role="button"
              tabIndex={0}
              title={t('ide.chat.revertFile', undefined, {
                defaultValue: 'Revert to last commit',
              })}
              onClick={(event) => {
                event.stopPropagation()
                // Revert the file to its last committed state (modified, new, deleted).
                ctx.env.http
                  .post(`/projects/${ctx.props.projectId}/git-revert`, { path: f.path })
                  .then(() => {
                    ctx.git.refreshGitStatus()
                    // Refresh the editor if the file is open — fetch fresh content
                    // for a modified/restored file, close it if it was new and is
                    // now gone.
                    if (f.status === 'untracked' || f.status === 'added') {
                      ctx.props.onFileDeleted?.(f.path)
                    } else {
                      ctx.env.http
                        .get<{ content: string }>(
                          `/projects/${ctx.props.projectId}/files/${f.path}`,
                        )
                        .then((res) => ctx.props.onFileChange?.(f.path, res.data.content))
                        .catch((error) => {
                          ctx.env.logger.warn(
                            `chat-panel: refreshing open file "${f.path}" after revert failed; editor shows pre-revert content`,
                            { error },
                          )
                        })
                    }
                  })
                  .catch((error) => {
                    ctx.env.logger.warn(
                      `chat-panel: git revert of "${f.path}" failed; file list unchanged`,
                      { error },
                    )
                  })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') event.currentTarget.click()
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                event.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
                event.currentTarget.style.opacity = '0.5'
              }}
              style={revertControlStyle(f)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="currentColor"
              >
                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
              </svg>
            </span>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <Show when={ctx.timeline.workVisible()}>
      <WorkCard>
        {/* The plan and the background commands (a detached command outlives its
            tool call, so its own card goes green while it still runs). */}
        <PlanCard
          todos={ctx.timeline.plan()}
          live={ctx.timeline.planLive()}
          awaitingUser={ctx.timeline.planAwaiting()}
        />
        <BackgroundTasksStrip tasks={ctx.chat.backgroundTasks()} />
        <Show when={ctx.timeline.showTests()}>
          <Show
            when={ctx.props.nativeTests}
            fallback={
              <TestStatusBar
                run={ctx.tests.testsRun()}
                agentName={ctx.props.agentName}
                tests={ctx.tests.testsList()}
                onOpen={() => ctx.tests.openTestsBrowser('')}
                onStop={
                  ctx.tests.testsRun().running && !ctx.tests.testsRun().external
                    ? () => ctx.tests.cancelTestsRun()
                    : undefined
                }
              />
            }
          >
            {(native) => native().renderStatus(() => ctx.renderHandlers.stableOpenTestsBrowser(''))}
          </Show>
        </Show>
        {/* Commit bar — anchored above the textarea, hidden entirely for a
            read-only viewer (committing is editor work). */}
        <Show when={pendingFilesForBar()}>
          {(files) => (
            <DockStrip
              molId="chat-commit-bar"
              toggleMolId="chat-commit-toggle"
              expanded={ctx.git.commitBarExpanded()}
              onToggle={() => ctx.git.setCommitBarExpanded((value) => !value)}
              hideLabel
              label={t('ide.chat.showChangedFiles', undefined, {
                defaultValue: 'Show changed files',
              })}
              actions={renderActions(files)}
            >
              {renderFileList(files)}
            </DockStrip>
          )}
        </Show>
      </WorkCard>
    </Show>
  )
}
