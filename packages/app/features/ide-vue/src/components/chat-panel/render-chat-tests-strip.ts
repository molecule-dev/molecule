/**
 * The work card — React's render section "Tests status strip", whose comment
 * sits on the first strip but whose element is the whole tray above the
 * composer: the plan, the background commands, the tests status strip and the
 * changed-files (commit) bar, one `WorkCard` with a dock strip each.
 *
 * The plan and the background commands render for any viewer; the tests status
 * strip also renders for a read-only viewer (watching is not editing); the
 * commit bar renders for editors only. When auto-commit is on the green badge
 * occupies the commit bar's button slot — a labelled "Commit" that becomes the
 * live countdown for the debounce's final seconds — and the plain blue button
 * covers auto-commit-off and the committing/committed states. Both commit
 * actions are inert while the agent works, because committing mid-turn would
 * stage a half-written tree.
 *
 * Everything is written for Vue's `h()`: styles as explicit `px` strings (Vue
 * never adds a unit) and React's own imperative hover affordances reproduced by
 * writing the element's `style`, so the DOM matches React's for the same input.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { isAutoCommitEnabled } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'

import { AutoCommitBadge } from '../../parts/AutoCommitBadge.js'
import { BackgroundTasksStrip } from '../../parts/BackgroundTasksStrip.js'
import { DockStrip } from '../../parts/DockStrip.js'
import { PlanCard } from '../../parts/PlanCard.js'
import { TestStatusBar } from '../../parts/TestStatusBar.js'
import { WorkCard } from '../../parts/WorkCard.js'
import type { ChatCtx } from './context.js'
import type { PendingFile } from './use-chat-git.js'

const logger = getLogger('chat-panel')

/**
 * Renders one changed-file row: its path, its line counts and the per-file
 * revert control, which writes the file back to its last committed state and
 * refreshes the open editor.
 *
 * @param ctx - The panel context (HTTP, the project and the host's file callbacks).
 * @param file - The changed file the git status reported.
 * @returns The row.
 */
function renderPendingFileRow(ctx: ChatCtx, file: PendingFile): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const http = ctx.env.http
  const projectId = ctx.props.projectId
  const isCoarse = ctx.env.isCoarse.value
  const onFileDiff = ctx.props.onFileDiff
  const onFileRevert = ctx.props.onFileRevert

  return h(
    'button',
    {
      /* mol-bespoke-button: pending file row — dense monospace row that opens a diff, one of a list */
      key: file.path,
      type: 'button',
      onClick: () => onFileDiff?.(file.path),
      onMouseenter: (event: MouseEvent) => {
        // Theme PRIMARY token, not a literal blue — the row sits in the same bar
        // as the commit button, which is primary.
        const target = event.currentTarget as HTMLElement | null
        if (target) target.style.color = 'var(--mol-color-primary, #4070e0)'
      },
      onMouseleave: (event: MouseEvent) => {
        const target = event.currentTarget as HTMLElement | null
        if (target) target.style.color = ''
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        padding: '1px 0',
        // Touch: ~15px rows are untappable — 32px is the floor for these dense
        // file rows.
        ...(isCoarse ? { minHeight: '32px' } : {}),
        cursor: onFileDiff ? 'pointer' : 'default',
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: '11px',
        color: 'inherit',
        opacity: '0.7',
        textAlign: 'left',
        width: '100%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      },
      class: cm.textMuted,
    },
    [
      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, [file.path]),
      file.additions || file.deletions
        ? h(
            'span',
            { style: { marginLeft: 'auto', flexShrink: 0, fontSize: '10px', opacity: '0.8' } },
            [
              file.additions
                ? h('span', { style: { color: '#3fb950' } }, [`+${file.additions}`])
                : null,
              file.additions && file.deletions ? ' ' : null,
              file.deletions
                ? h('span', { style: { color: '#f85149' } }, [`-${file.deletions}`])
                : null,
            ],
          )
        : null,
      onFileRevert
        ? h(
            'span',
            {
              /* mol-bespoke-button: icon-only per-file revert affordance — 18px (32px coarse) hit box on a dense file row */
              role: 'button',
              tabindex: 0,
              title: t('ide.chat.revertFile', undefined, {
                defaultValue: 'Revert to last commit',
              }),
              onClick: (event: MouseEvent) => {
                event.stopPropagation()
                // Revert file to last committed state (handles modified, new, and
                // deleted files)
                http
                  .post(`/projects/${projectId}/git-revert`, { path: file.path })
                  .then(() => {
                    ctx.git.refreshGitStatus()
                    // Refresh editor if the file is open — fetch fresh content for
                    // modified/restored, or close if it was a new file that got
                    // deleted
                    if (file.status === 'untracked' || file.status === 'added') {
                      ctx.props.onFileDeleted?.(file.path)
                    } else {
                      // Re-fetch file content from sandbox to update editor
                      http
                        .get<{ content: string }>(`/projects/${projectId}/files/${file.path}`)
                        .then((res) => ctx.props.onFileChange?.(file.path, res.data.content))
                        .catch((error: unknown) => {
                          logger.warn(
                            `chat-panel: refreshing open file "${file.path}" after revert failed; editor shows pre-revert content`,
                            { error },
                          )
                        })
                    }
                  })
                  .catch((error: unknown) => {
                    logger.warn(
                      `chat-panel: git revert of "${file.path}" failed; file list unchanged`,
                      { error },
                    )
                  })
              },
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  const target = event.currentTarget as HTMLElement | null
                  target?.click()
                }
              },
              onMouseenter: (event: MouseEvent) => {
                const target = event.currentTarget as HTMLElement | null
                if (!target) return
                target.style.background = 'rgba(128,128,128,0.2)'
                target.style.opacity = '1'
              },
              onMouseleave: (event: MouseEvent) => {
                const target = event.currentTarget as HTMLElement | null
                if (!target) return
                target.style.background = 'transparent'
                target.style.opacity = '0.5'
              },
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Touch: 32px hit box (dense-row floor); glyph unchanged.
                width: isCoarse ? '32px' : '18px',
                height: isCoarse ? '32px' : '18px',
                borderRadius: '3px',
                flexShrink: 0,
                cursor: 'pointer',
                opacity: '0.5',
                transition: 'opacity 100ms, background 100ms',
                ...(file.additions || file.deletions ? {} : { marginLeft: 'auto' }),
              },
            },
            [
              h(
                'svg',
                {
                  xmlns: 'http://www.w3.org/2000/svg',
                  viewBox: '0 0 16 16',
                  width: '12',
                  height: '12',
                  fill: 'currentColor',
                },
                [
                  h('path', {
                    d: 'M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z',
                  }),
                ],
              ),
            ],
          )
        : null,
    ],
  )
}

/**
 * Renders the tests status strip, the plan, the background tasks and the commit
 * bar as the one work card React renders above the composer.
 *
 * @param ctx - The panel context (the timeline derivations, the git slice, the
 *   auto-commit state, the tests controller and the host's file callbacks).
 * @returns The work card, or `null` while it is hidden.
 */
export function renderChatTestsStrip(ctx: ChatCtx): VNodeChild {
  if (!ctx.timeline.workVisible.value) return null

  const cm = ctx.env.cm
  const t = ctx.env.t
  const showTests = ctx.timeline.showTests.value
  const showFiles = ctx.timeline.showFiles.value
  const pendingFiles = ctx.git.pendingFiles.value
  const commitState = ctx.git.commitState.value
  const commitBarExpanded = ctx.git.commitBarExpanded.value
  const autoCommit = ctx.autoCommit.autoCommit.value
  const autoCommitHeld = ctx.autoCommit.autoCommitHeld.value
  const testsRun = ctx.tests.testsRun.value
  const testsList = ctx.tests.testsList.value
  const nativeTests = ctx.props.nativeTests

  return h(WorkCard, null, {
    default: () => [
      // The plan and the background commands (a detached command outlives its
      // tool call, so its own card goes green while it still runs).
      h(PlanCard, {
        todos: ctx.timeline.plan.value,
        live: ctx.timeline.planLive.value,
        awaitingUser: ctx.timeline.planAwaiting.value,
      }),
      h(BackgroundTasksStrip, { tasks: ctx.chat.backgroundTasks.value }),
      showTests
        ? nativeTests
          ? nativeTests.renderStatus(() => {
              ctx.tests.openTestsBrowser('')
            })
          : h(TestStatusBar, {
              run: testsRun,
              agentName: ctx.props.agentName,
              tests: testsList,
              onOpen: () => {
                ctx.tests.openTestsBrowser('')
              },
              onStop: testsRun.running && !testsRun.external ? ctx.tests.cancelTestsRun : undefined,
            })
        : null,
      // Commit bar — anchored above the textarea. Hidden entirely for a
      // read-only VIEWER: committing/reverting is editor work, so the bar is a
      // dead control for them.
      showFiles && pendingFiles != null
        ? h(
            DockStrip,
            {
              molId: 'chat-commit-bar',
              toggleMolId: 'chat-commit-toggle',
              expanded: commitBarExpanded,
              onToggle: () => {
                ctx.git.setCommitBarExpanded((expanded) => !expanded)
              },
              hideLabel: true,
              label: t('ide.chat.showChangedFiles', undefined, {
                defaultValue: 'Show changed files',
              }),
              actions:
                isAutoCommitEnabled(autoCommit) &&
                commitState?.status !== 'committing' &&
                commitState?.status !== 'committed'
                  ? h(AutoCommitBadge, {
                      state: autoCommit,
                      label: t(
                        'ide.chat.commitFileCount',
                        { count: pendingFiles.length },
                        {
                          count: pendingFiles.length,
                          defaultValue: 'Commit {{count}} files',
                          defaultValue_one: 'Commit {{count}} file',
                        },
                      ),
                      disabled: autoCommitHeld,
                      onCommitNow: () => {
                        // Pause the countdown before committing so a due auto-fire
                        // doesn't race the manual commit onto a freshly clean tree.
                        ctx.autoCommit.dispatchAutoCommit({ type: 'fired' })
                        void ctx.git.handleCommit()
                      },
                      inline: true,
                    })
                  : (() => {
                      const commitBusy =
                        commitState?.status === 'committing' ||
                        commitState?.status === 'committed' ||
                        autoCommitHeld
                      return h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'chat-commit-button',
                          onClick: (event: MouseEvent) => {
                            event.stopPropagation()
                            if (commitBusy) return
                            void ctx.git.handleCommit()
                          },
                          disabled: commitBusy,
                          class: cm.cn(
                            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                            cm.touchTargetCompact,
                          ),
                        },
                        [
                          commitState?.status === 'committing'
                            ? t('ide.chat.committing', undefined, {
                                defaultValue: 'Committing...',
                              })
                            : commitState?.status === 'committed'
                              ? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
                              : t(
                                  'ide.chat.commitFileCount',
                                  { count: pendingFiles.length },
                                  {
                                    count: pendingFiles.length,
                                    defaultValue: 'Commit {{count}} files',
                                    defaultValue_one: 'Commit {{count}} file',
                                  },
                                ),
                        ],
                      )
                    })(),
            },
            {
              default: () => [
                h(
                  'div',
                  { style: { maxHeight: '200px', overflowY: 'auto' } },
                  pendingFiles.map((file) => renderPendingFileRow(ctx, file)),
                ),
              ],
            },
          )
        : null,
    ],
  })
}
