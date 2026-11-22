/**
 * `chat:git` — React's four `chat:git` regions: the commit state and cards, the
 * commit bar's expansion, the pending-files list and the git actions (commit,
 * revert a commit, revert a file, refresh the status).
 *
 * This port fills the `chat:git` region that fetches and refreshes the
 * uncommitted-files list: the generation counters that drop stale answers, the
 * immediate and debounced fetches, the turn-boundary / host-tick / visibility
 * triggers, and the project-change reset. The commit actions themselves stay
 * with their own unit.
 *
 * @module
 */

import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

const logger = getLogger('chat-panel')

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** One uncommitted file, as the git status lists it. */
export interface PendingFile {
  /** The project-relative path. */
  path: string
  /** The porcelain status letter(s). */
  status: string
  /** Lines added since HEAD. */
  additions?: number
  /** Lines removed since HEAD. */
  deletions?: number
}

/** The commit bar's in-flight outcome. */
export interface CommitState {
  /** Where the commit is. */
  status: 'committing' | 'committed' | 'error'
  /** The server's message for an error or a summary. */
  message?: string
}

/** What the `chat:git` slice exposes. */
export interface ChatGitSlice {
  /** Writes a file back and refreshes the git status. */
  readonly handleFileRevert: (path: string, content: string) => Promise<void>
  /** The refresh ticker the git status reads. */
  readonly gitStatusTick: Ref<number>
  /** The commit cards in the timeline. */
  readonly commitCards: Ref<CommitCard[]>
  /** Sets the commit cards. */
  readonly setCommitCards: SetState<CommitCard[]>
  /** Commits the working tree. */
  readonly handleCommit: () => Promise<void>
  /** The uncommitted files, or `null` before the first status arrives. */
  readonly pendingFiles: Ref<PendingFile[] | null>
  /** Reverts a commit by hash; returns the new commit's hash on success. */
  readonly handleRevertCommit: (hash: string) => Promise<string | undefined>
  /** Whether the commit bar's file list is expanded. */
  readonly commitBarExpanded: Ref<boolean>
  /** Sets the commit bar's expansion. */
  readonly setCommitBarExpanded: SetState<boolean>
  /** The commit bar's in-flight outcome, or `null`. */
  readonly commitState: Ref<CommitState | null>
  /** Re-fetches the git status. */
  readonly refreshGitStatus: () => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:git:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:git:2`. */
    readonly 2: ChatEffect
    /** `#effect chat:git:3`. */
    readonly 3: ChatEffect
    /** `#effect chat:git:4`. */
    readonly 4: ChatEffect
  }
}

/**
 * Builds the `chat:git` slice.
 *
 * @param ctx - The panel context (HTTP, props, the chat slice's nudge ref).
 * @returns The git slice.
 */
export function createChatGit(ctx: ChatCtx): ChatGitSlice {
  const pendingFiles = ref<PendingFile[] | null>(null)
  const commitState = ref<CommitState | null>(null)
  const commitBarExpanded = ref(false)
  const setCommitBarExpanded = makeSetter(commitBarExpanded)
  const commitCards = ref<CommitCard[]>([])
  const setCommitCards = makeSetter(commitCards)
  const gitStatusTick = ref(0)

  /**
   * Bumps the internal status ticker, which re-runs the status fetch.
   *
   * React's `setGitStatusTick` only SCHEDULES the render whose effect fetches,
   * so a caller that awaits a host write and then toggles undo (the tool card's
   * revert) reaches its `POST /tool-call-undo` before the `GET /git-status`.
   * Bumping a Vue ref flushes its `post` watcher in the same microtask, which
   * would issue the fetch first; one more microtask defers the tick past the
   * caller's own await continuation, restoring React's order.
   */
  const refreshGitStatus = (): void => {
    queueMicrotask(() => {
      gitStatusTick.value += 1
    })
  }

  // Generation counters: a git request remembers the generation it started in and drops its
  // result when the counter has moved on. Ending a scope (another project, an unmount) moves it.
  const gitScopeRef: MutableRef<number> = { current: 0 }
  const endGitScope = (): void => {
    gitScopeRef.current++
  }
  const gitStatusRequestRef: MutableRef<number> = { current: 0 }
  const dropGitStatusRequests = (): void => {
    gitStatusRequestRef.current++
  }

  /**
   * Fetches the working tree's uncommitted files, dropping the answer when a
   * newer request or a newer scope has superseded it.
   *
   * @returns A promise that settles once the fetch is handled.
   */
  const fetchPendingFiles = (): Promise<void> => {
    const scope = gitScopeRef.current
    const request = ++gitStatusRequestRef.current
    return ctx.env.http
      .get<{ files: { path: string; status: string; additions?: number; deletions?: number }[] }>(
        `/projects/${ctx.props.projectId}/git-status`,
      )
      .then((res) => {
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current)
          pendingFiles.value = res.data.files.length > 0 ? res.data.files : null
      })
      .catch((error: unknown) => {
        // Transient: the bar re-fetches on every turn boundary and file change.
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current) {
          logger.debug('chat-panel: git-status fetch failed; pending-files bar hidden', { error })
          pendingFiles.value = null
        }
      })
  }

  // Debounced version — coalesces rapid ticks (e.g. save → format, or an AI
  // write burst mid-turn) into a single fetch after the last write settles.
  const gitFetchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }
  /**
   * Coalesces rapid pending-files nudges into one fetch 400 ms after the last.
   */
  const debouncedFetchPendingFiles = (): void => {
    if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
    gitFetchTimerRef.current = setTimeout(() => {
      gitFetchTimerRef.current = null
      void fetchPendingFiles()
    }, 400)
  }
  // Expose to onFileChangeWrapped (declared earlier): AI writes streaming in
  // mid-turn refresh the bar live instead of waiting for the turn to end.
  ctx.chat.debouncedFetchPendingFilesRef.current = debouncedFetchPendingFiles

  // React resets this slice's state while rendering when the project changes.
  const gitProjectId = ref(ctx.props.projectId)
  /**
   * Clears the git state when the panel moves to another project.
   *
   * @param projectId - The project the panel now shows.
   */
  const resetForProject = (projectId: string): void => {
    if (gitProjectId.value === projectId) return
    gitProjectId.value = projectId
    pendingFiles.value = null
    commitState.value = null
    commitCards.value = []
    commitBarExpanded.value = false
  }

  /**
   * Writes a file back to its original content and refreshes the git status,
   * so undo / redo also settle the changed-files bar.
   *
   * @param path - The project-relative path to write.
   * @param content - The content to restore.
   * @returns A promise settled once the write and the refresh were requested.
   */
  const handleFileRevert = async (path: string, content: string): Promise<void> => {
    await ctx.props.onFileRevert?.(path, content)
    refreshGitStatus()
  }

  /**
   * Commits the working tree, tracking the in-flight status and its timeline
   * card: the running card, the success that clears the bar, or one of the
   * refusals (a clean tree, a build in progress, anything else) and the
   * network failure that marks the card failed.
   *
   * @returns A promise settled once the request was handled.
   */
  const handleCommit = async (): Promise<void> => {
    const scope = gitScopeRef.current
    // An older status response must not restore a pre-commit count.
    gitStatusRequestRef.current++
    commitState.value = { status: 'committing' }
    const cardId = `commit-${Date.now()}`
    commitCards.value = [
      ...commitCards.value,
      { id: cardId, message: '', files: [], timestamp: Date.now(), status: 'running' },
    ]
    try {
      const result = await ctx.env.http.post<{
        ok: boolean
        committed: boolean
        message?: string
        files?: string[]
        hash?: string
      }>(`/projects/${ctx.props.projectId}/commit`)
      if (scope !== gitScopeRef.current) return
      if (result.data.committed) {
        gitStatusRequestRef.current++
        const message =
          result.data.message ??
          ctx.env.t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
        commitState.value = { status: 'committed', message }
        pendingFiles.value = null
        commitBarExpanded.value = false
        commitCards.value = commitCards.value.map((card) =>
          card.id === cardId
            ? {
                ...card,
                message,
                files: result.data.files ?? [],
                status: 'done' as const,
                hash: result.data.hash,
              }
            : card,
        )
        ctx.props.onCommit?.()
        setTimeout(() => {
          if (scope === gitScopeRef.current) commitState.value = null
        }, 3000)
      } else {
        commitCards.value = commitCards.value.filter((card) => card.id !== cardId)
        commitState.value = null
        ctx.systemCards.addSystemCard(
          result.data.message === 'No changes to commit'
            ? ctx.env.t('ide.chat.commitNoChanges', undefined, {
                defaultValue: 'No changes to commit.',
              })
            : result.data.message === 'A build is in progress'
              ? ctx.env.t('ide.chat.commitBuildInProgress', undefined, {
                  defaultValue: 'Wait for the build to finish before creating a Git commit.',
                })
              : ctx.env.t('ide.chat.commitError', undefined, {
                  defaultValue: 'Failed to commit changes.',
                }),
        )
        void fetchPendingFiles()
        ctx.props.onCommit?.()
      }
    } catch (error) {
      if (scope !== gitScopeRef.current) return
      logger.warn('Commit request failed', { error })
      commitCards.value = commitCards.value.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: 'error' as const,
              message: ctx.env.t('ide.chat.commitFailed', undefined, {
                defaultValue: 'Commit failed',
              }),
            }
          : card,
      )
      commitState.value = { status: 'error' }
      setTimeout(() => {
        if (scope === gitScopeRef.current) commitState.value = null
      }, 3000)
    }
  }

  /**
   * Reverts a commit by hash; the caller shows its own error UI on failure.
   *
   * @param hash - The commit to revert.
   * @returns The new revert commit's hash on success, otherwise `undefined`.
   */
  const handleRevertCommit = async (hash: string): Promise<string | undefined> => {
    try {
      const result = await ctx.env.http.post<{
        ok: boolean
        message?: string
        hash?: string
        error?: string
      }>(`/projects/${ctx.props.projectId}/revert-commit`, { hash })
      if (result.data.ok) {
        ctx.props.onCommit?.()
        return result.data.hash
      }
    } catch (_error) {
      // network/server failure — caller receives `undefined` and can show its own error UI
    }
    return undefined
  }

  return {
    handleFileRevert,
    gitStatusTick,
    commitCards,
    setCommitCards,
    handleCommit,
    pendingFiles,
    handleRevertCommit,
    commitBarExpanded,
    setCommitBarExpanded,
    commitState,
    refreshGitStatus,
    effects: {
      1: () => {
        // React's layout effect: end the scope on mount, and on every project
        // change (its cleanup ends the old scope too). Ending a scope also drops
        // the panel's nudge once it unmounts.
        onMounted(() => {
          resetForProject(ctx.props.projectId)
          endGitScope()
        })
        watch(
          () => ctx.props.projectId,
          (projectId) => {
            resetForProject(projectId)
            endGitScope()
          },
          { flush: 'post' },
        )
        onUnmounted(() => {
          endGitScope()
          ctx.chat.debouncedFetchPendingFilesRef.current = null
        })
      },
      2: () => {
        // Fetch on turn boundaries and internal refreshGitStatus() calls.
        onMounted(() => {
          void fetchPendingFiles()
        })
        watch(
          () => ctx.chat.isLoading.value,
          () => {
            void fetchPendingFiles()
          },
          { flush: 'post' },
        )
        watch(
          gitStatusTick,
          () => {
            void fetchPendingFiles()
          },
          { flush: 'post' },
        )
        watch(
          [() => ctx.props.projectId, () => ctx.env.http],
          () => {
            void fetchPendingFiles()
          },
          { flush: 'post' },
        )
      },
      3: () => {
        // Fetch when the parent signals a file mutation (edit, rename, delete) —
        // debounced so save+format coalesces into one fetch after the final write.
        // React's effect also re-runs when its fetch callback changes identity
        // (a project change), so the project is part of this watcher too.
        watch(
          [() => ctx.props.gitStatusTick, () => ctx.props.projectId],
          ([tick]) => {
            if (!tick) return
            debouncedFetchPendingFiles()
          },
          { flush: 'post' },
        )
      },
      4: () => {
        // Startup repairs, another editor, or another client can commit without a
        // local file event. Reconcile on return and while the workspace is visible.
        onMounted(() => {
          /**
           * Refreshes the status when the workspace is visible.
           */
          const refresh = (): void => {
            if (document.visibilityState !== 'hidden') void fetchPendingFiles()
          }
          window.addEventListener('focus', refresh)
          document.addEventListener('visibilitychange', refresh)
          const interval = setInterval(refresh, 45_000)
          onUnmounted(() => {
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refresh)
            clearInterval(interval)
            if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
            dropGitStatusRequests()
          })
        })
      },
    },
  }
}
