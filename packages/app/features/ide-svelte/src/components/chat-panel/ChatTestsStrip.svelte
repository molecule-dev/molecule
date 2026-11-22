<!--
  React's section “Tests status strip” (ChatPanel.tsx 8019–8281), whose comment
  names the first strip but whose element is the whole work tray above the
  composer: the plan, the background commands, the tests status strip and the
  changed-files (commit) bar, one `WorkCard` with a dock strip each.

  The plan and the background commands render for any viewer; the tests status
  strip also renders for a read-only viewer (watching is not editing); the
  commit bar renders for editors only. When auto-commit is on, the green badge
  occupies the commit bar's button slot — a labelled "Commit" that becomes the
  live countdown for the debounce's final seconds — and the plain blue button
  covers auto-commit-off and the committing/committed states. Both commit
  actions are inert while the agent works, because committing mid-turn would
  stage a half-written tree.

  View only: the state and the handlers come from the slices through `ctx`.
  React's inline styles are hand-written `px` strings; its imperative hover
  writes are reproduced in the event handlers, so the DOM matches React's for
  the same input.
-->
<script lang="ts">
  import { isAutoCommitEnabled } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'

  import AutoCommitBadge from '../../parts/AutoCommitBadge.svelte'
  import BackgroundTasksStrip from '../../parts/BackgroundTasksStrip.svelte'
  import DockStrip from '../../parts/DockStrip.svelte'
  import PlanCard from '../../parts/PlanCard.svelte'
  import TestStatusBar from '../../parts/TestStatusBar.svelte'
  import WorkCard from '../../parts/WorkCard.svelte'
  import type { PendingFileEntry } from './chat-git.svelte.js'
  import type { ChatContext } from './context.svelte.js'

  /** The package logger (the same channel the rest of the panel logs on). */
  const logger = getLogger('chat-panel')

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  const plan = $derived(ctx.timeline.plan)
  const planLive = $derived(ctx.timeline.planLive)
  const planAwaiting = $derived(ctx.timeline.planAwaiting)
  const workVisible = $derived(ctx.timeline.workVisible)
  const showTests = $derived(ctx.timeline.showTests)
  const showFiles = $derived(ctx.timeline.showFiles)
  const nativeTests = $derived(ctx.props.nativeTests)
  const pendingFiles = $derived(ctx.git.pendingFiles)
  const pendingCount = $derived(pendingFiles?.length ?? 0)
  const filesToShow = $derived(pendingFiles ?? [])
  const commitState = $derived(ctx.git.commitState)
  const commitBarExpanded = $derived(ctx.git.commitBarExpanded)
  const autoCommit = $derived(ctx.autoCommit.autoCommit)
  const autoCommitHeld = $derived(ctx.autoCommit.autoCommitHeld)
  const testsRun = $derived(ctx.tests.testsRun)
  const testsList = $derived(ctx.tests.testsList)
  const onFileDiff = $derived(ctx.props.onFileDiff)
  const onFileRevert = $derived(ctx.props.onFileRevert)

  /**
   * React's per-file row: a dense monospace row that opens a diff, one of a
   * list. Its style is the exact attribute text React's style object serializes
   * to (numbers as `px`, except the unitless `opacity`).
   *
   * @param isCoarse - Whether the primary pointer is coarse (touch floor).
   * @param hasDiff - Whether clicking the row opens a diff (else the cursor is the default).
   * @returns The `style` attribute text.
   */
  function rowStyle(isCoarse: boolean, hasDiff: boolean): string {
    // `background: none` is set by the `style:background` directive, not this
    // string: Svelte applies a dynamic style attribute through the CSSOM's
    // `cssText`, where a `border` declaration makes jsdom drop it, while React
    // sets each property and keeps it.
    return `display: flex; align-items: center; gap: 6px; border: none; padding: 1px 0;${
      isCoarse ? ' min-height: 32px;' : ''
    } cursor: ${hasDiff ? 'pointer' : 'default'}; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: inherit; opacity: 0.7; text-align: left; width: 100%; overflow: hidden; white-space: nowrap`
  }

  /**
   * React's per-file revert affordance: an 18px (32px coarse) hit box on a dense
   * file row.
   *
   * @param isCoarse - Whether the primary pointer is coarse.
   * @param hasCounts - Whether the row carries line counts (else the control is
   *   pushed to the right).
   * @returns The `style` attribute text.
   */
  function revertStyle(isCoarse: boolean, hasCounts: boolean): string {
    return `display: inline-flex; align-items: center; justify-content: center; width: ${
      isCoarse ? 32 : 18
    }px; height: ${isCoarse ? 32 : 18}px; border-radius: 3px; flex-shrink: 0; cursor: pointer; opacity: 0.5; transition: opacity 100ms, background 100ms;${
      hasCounts ? '' : ' margin-left: auto;'
    }`
  }

  /**
   * Reverts one file to its last committed state and refreshes the open editor.
   *
   * @param file - The changed file whose revert control was activated.
   */
  function revertFile(file: PendingFileEntry): void {
    const projectId = ctx.props.projectId
    ctx.env.http
      .post(`/projects/${projectId}/git-revert`, { path: file.path })
      .then(() => {
        ctx.git.refreshGitStatus()
        // Refresh the editor if the file is open — fetch fresh content for a
        // modified/restored file, or close it if it was a new file now deleted.
        if (file.status === 'untracked' || file.status === 'added') {
          ctx.props.onFileDeleted?.(file.path)
        } else {
          ctx.env.http
            .get<{ content: string }>(`/projects/${projectId}/files/${file.path}`)
            .then((res) => ctx.props.onFileChange?.(file.path, res.data.content))
            .catch((error) => {
              logger.warn(
                `chat-panel: refreshing open file "${file.path}" after revert failed; editor shows pre-revert content`,
                { error },
              )
            })
        }
      })
      .catch((error) => {
        logger.warn(`chat-panel: git revert of "${file.path}" failed; file list unchanged`, {
          error,
        })
      })
  }
</script>

{#if workVisible}
  <WorkCard>
    <!-- The plan and the background commands (a detached command outlives its
         tool call, so its own card goes green while it still runs). -->
    <PlanCard todos={plan} live={planLive} awaitingUser={planAwaiting} />
    <BackgroundTasksStrip tasks={ctx.chat.backgroundTasks} />
    {#if showTests}
      {#if nativeTests}
        {@render nativeTests.renderStatus(() => ctx.tests.openTestsBrowser(''))}
      {:else}
        <TestStatusBar
          run={testsRun}
          agentName={ctx.agentName}
          tests={testsList}
          onOpen={() => ctx.tests.openTestsBrowser('')}
          onStop={testsRun.running && !testsRun.external ? ctx.tests.cancelTestsRun : undefined}
        />
      {/if}
    {/if}
    {#if showFiles && pendingFiles != null}
      {@const commitBusy =
        commitState?.status === 'committing' ||
        commitState?.status === 'committed' ||
        autoCommitHeld}
      {#snippet commitActions()}
        {#if isAutoCommitEnabled(autoCommit) && commitState?.status !== 'committing' && commitState?.status !== 'committed'}
          <AutoCommitBadge
            state={autoCommit}
            label={ctx.env.t(
              'ide.chat.commitFileCount',
              { count: pendingCount },
              {
                count: pendingCount,
                defaultValue: 'Commit {{count}} files',
                defaultValue_one: 'Commit {{count}} file',
              },
            )}
            disabled={autoCommitHeld}
            onCommitNow={() => {
              // Pause the countdown before committing so a due auto-fire doesn't
              // race the manual commit onto a freshly clean tree (which would drop
              // a noisy "No changes to commit" card).
              ctx.autoCommit.dispatchAutoCommit({ type: 'fired' })
              void ctx.git.handleCommit()
            }}
            inline
          />
        {:else}
          <button
            type="button"
            data-mol-id="chat-commit-button"
            onclick={(e) => {
              e.stopPropagation()
              if (commitBusy) return
              void ctx.git.handleCommit()
            }}
            disabled={commitBusy}
            class={ctx.env.cm.cn(
              ctx.env.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              ctx.env.cm.touchTargetCompact,
            )}
          >
            {commitState?.status === 'committing'
              ? ctx.env.t('ide.chat.committing', undefined, {
                  defaultValue: 'Committing...',
                })
              : commitState?.status === 'committed'
                ? ctx.env.t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
                : ctx.env.t(
                    'ide.chat.commitFileCount',
                    { count: pendingCount },
                    {
                      count: pendingCount,
                      defaultValue: 'Commit {{count}} files',
                      defaultValue_one: 'Commit {{count}} file',
                    },
                  )}
          </button>
        {/if}
      {/snippet}
      <DockStrip
        molId="chat-commit-bar"
        toggleMolId="chat-commit-toggle"
        expanded={commitBarExpanded}
        onToggle={() => ctx.git.setCommitBarExpanded((expanded) => !expanded)}
        hideLabel
        label={ctx.env.t('ide.chat.showChangedFiles', undefined, {
          defaultValue: 'Show changed files',
        })}
        actions={commitActions}
      >
        <div style="max-height: 200px; overflow-y: auto">
          {#each filesToShow as f (f.path)}
            <button
              type="button"
              onclick={() => onFileDiff?.(f.path)}
              onmouseenter={(e) => {
                // Theme PRIMARY token, not a literal blue — the row sits in the
                // same bar as the commit button, which is primary.
                e.currentTarget.style.color = 'var(--mol-color-primary, #4070e0)'
              }}
              onmouseleave={(e) => {
                e.currentTarget.style.color = ''
              }}
              style={rowStyle(ctx.env.isCoarse, onFileDiff != null)}
              style:background="none"
              class={ctx.env.cm.textMuted}
            >
              <span style="overflow: hidden; text-overflow: ellipsis">{f.path}</span>
              {#if f.additions || f.deletions}
                <span style="margin-left: auto; flex-shrink: 0; font-size: 10px; opacity: 0.8">
                  {#if f.additions}<span style="color: #3fb950">+{f.additions}</span
                    >{/if}{#if f.additions && f.deletions}{f.additions && f.deletions
                      ? ' '
                      : ''}{/if}{#if f.deletions}<span style="color: #f85149">-{f.deletions}</span
                    >{/if}
                </span>
              {/if}
              {#if onFileRevert}
                <span
                  role="button"
                  tabindex={0}
                  title={ctx.env.t('ide.chat.revertFile', undefined, {
                    defaultValue: 'Revert to last commit',
                  })}
                  onclick={(e) => {
                    e.stopPropagation()
                    revertFile(f)
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                  }}
                  onmouseenter={(e) => {
                    e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onmouseleave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.opacity = '0.5'
                  }}
                  style={revertStyle(ctx.env.isCoarse, !!(f.additions || f.deletions))}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="currentColor"
                  >
                    <path
                      d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"
                    />
                  </svg>
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </DockStrip>
    {/if}
  </WorkCard>
{/if}
