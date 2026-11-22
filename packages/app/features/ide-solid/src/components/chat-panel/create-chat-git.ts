/**
 * `chat:git` — the uncommitted-files bar: its fetching (the refresh tick, the
 * generation counters that drop stale answers, the debounced fetch and the four
 * mount effects) plus the commit, revert and revert-commit actions. The state
 * resets on a project switch, the strip reflects the commit in flight, and the
 * commit cards the timeline renders live here.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js'

import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** The in-flight commit's state (the commit bar reflects it). */
export type CommitState =
  { status: 'committing' } | { status: 'committed'; message: string } | { status: 'error' }

/** A pending (uncommitted) file as the git-status endpoint reports it. */
export interface PendingFileEntry {
  /** The file's project-relative path. */
  path: string
  /** Git's short status letter. */
  status: string
  /** Lines added. */
  additions?: number
  /** Lines deleted. */
  deletions?: number
}

/** What other slices read from `chat:git`. */
export interface ChatGitSlice {
  /** The commit attempt's state, or null. */
  commitState: Accessor<CommitState | null>
  /** Sets the commit attempt's state. */
  setCommitState: Setter<CommitState | null>
  /** The uncommitted files, or null when the bar is hidden. */
  pendingFiles: Accessor<PendingFileEntry[] | null>
  /** Sets the uncommitted files (null hides the bar). */
  setPendingFiles: Setter<PendingFileEntry[] | null>
  /** Whether the commit bar is expanded. */
  commitBarExpanded: Accessor<boolean>
  /** Expands or collapses the commit bar. */
  setCommitBarExpanded: Setter<boolean>
  /** The commit cards the timeline renders. */
  commitCards: Accessor<CommitCard[]>
  /** Sets the commit cards. */
  setCommitCards: Setter<CommitCard[]>
  /** Bumps the git-status refresh tick. */
  refreshGitStatus: () => void
  /** Coalesces rapid file writes into one git-status fetch. */
  debouncedFetchPendingFiles: () => void
  /** Wraps the host's file revert and refreshes git status. */
  handleFileRevert: (path: string, content: string) => Promise<void>
  /** Commits the pending files. */
  handleCommit: () => Promise<void>
  /** Reverts a commit and returns the new commit hash, when the server made one. */
  handleRevertCommit: (hash: string) => Promise<string | undefined>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:git`.
 * @param ctx - The inner ctx (its project, HTTP client, logger and the chat
 *   slice's pending-files ref).
 * @returns The git slice.
 */
export function createChatGit(ctx: ChatInnerCtx): ChatGitSlice {
  const { http, logger } = ctx.env
  const [commitState, setCommitState] = createSignal<CommitState | null>(null)
  const [pendingFiles, setPendingFiles] = createSignal<PendingFileEntry[] | null>(null)
  const [commitBarExpanded, setCommitBarExpanded] = createSignal(false)
  const [commitCards, setCommitCards] = createSignal<CommitCard[]>([])
  const [gitStatusTick, setGitStatusTick] = createSignal(0)

  /**
   * Bumps the tick that effect 2 fetches on. React's effect runs after the
   * commit that carries the update, not synchronously inside the caller, so a
   * caller's continuation (the undo toggle persisted once the host's revert
   * resolves) records BEFORE the fetch; one deferred tick keeps that order.
   */
  let refreshPending = false
  const refreshGitStatus = (): void => {
    // Two microtask hops, coalesced: React flushes the tick's effect after the
    // callers' own continuation work for this task (a `/undo` command's persist
    // lands after both reverts; a card's toggle lands after its write), while a
    // single hop would run between two consecutive awaits.
    if (refreshPending) return
    refreshPending = true
    queueMicrotask(() => {
      queueMicrotask(() => {
        refreshPending = false
        setGitStatusTick((n) => n + 1)
      })
    })
  }

  // Generation counters: a git request remembers the generation it started in
  // and drops its result when the counter has moved on. Ending a scope
  // (another project, an unmount) moves it.
  const gitScopeRef: MutableRef<number> = { current: 0 }
  /** Ends the current git scope: every in-flight answer is dropped. */
  const endGitScope = (): void => {
    gitScopeRef.current++
  }

  // React resets on a project switch while rendering; this effect does the same
  // post-render (the initial value already matches, so the mount run does nothing).
  let gitProjectId = ctx.props.projectId
  createEffect(
    on(
      () => ctx.props.projectId,
      (projectId) => {
        if (gitProjectId === projectId) return
        gitProjectId = projectId
        setPendingFiles(null)
        setCommitState(null)
        setCommitCards([])
        setCommitBarExpanded(false)
      },
      { defer: true },
    ),
  )

  const gitStatusRequestRef: MutableRef<number> = { current: 0 }
  /** Drops every in-flight git-status answer. */
  const dropGitStatusRequests = (): void => {
    gitStatusRequestRef.current++
  }

  /**
   * Fetches the project's uncommitted files.
   * @returns Resolves once the answer landed or was dropped.
   */
  const fetchPendingFiles = (): Promise<void> => {
    const scope = gitScopeRef.current
    const request = ++gitStatusRequestRef.current
    return http
      .get<{ files: PendingFileEntry[] }>(`/projects/${ctx.props.projectId}/git-status`)
      .then((res) => {
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current)
          setPendingFiles(res.data.files.length > 0 ? res.data.files : null)
      })
      .catch((error) => {
        // Transient: the bar re-fetches on every turn boundary and file change.
        if (scope === gitScopeRef.current && request === gitStatusRequestRef.current) {
          logger.debug('chat-panel: git-status fetch failed; pending-files bar hidden', { error })
          setPendingFiles(null)
        }
      })
  }

  const gitFetchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }
  /**
   * Debounced fetch — coalesces rapid ticks (e.g. save → format, or an AI write
   * burst mid-turn) into a single fetch after the last write settles.
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

  /** Translates, reading the current locale at call time. */
  const t = ctx.env.t

  /**
   * Wraps the host's file revert so undo/redo also refreshes git status.
   * @param path - The file's workspace-relative path.
   * @param content - The content to write back.
   * @returns Resolves once the write and the refresh settled.
   */
  const handleFileRevert = async (path: string, content: string): Promise<void> => {
    await ctx.props.onFileRevert?.(path, content)
    refreshGitStatus()
  }

  /**
   * Commits the pending files through the project's commit route: the running
   * card appears first, a landed commit clears the strip and marks the card
   * done, a refusal adds the matching system card and re-fetches, and a
   * failure marks the card failed and re-arms the action after 3 s. Every
   * answer is dropped once the git scope ends (another project, an unmount).
   * @returns Resolves once the answer landed or was dropped.
   */
  const handleCommit = async (): Promise<void> => {
    const scope = gitScopeRef.current
    // An older status response must not restore a pre-commit count.
    gitStatusRequestRef.current++
    setCommitState({ status: 'committing' })
    const cardId = `commit-${Date.now()}`
    setCommitCards((prev) => [
      ...prev,
      { id: cardId, message: '', files: [], timestamp: Date.now(), status: 'running' },
    ])
    try {
      const result = await http.post<{
        ok: boolean
        committed: boolean
        message?: string
        files?: string[]
        hash?: string
      }>(`/projects/${ctx.props.projectId}/commit`)
      if (scope !== gitScopeRef.current) return
      if (result.data.committed) {
        gitStatusRequestRef.current++
        const msg =
          result.data.message ?? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
        setCommitState({ status: 'committed', message: msg })
        setPendingFiles(null)
        setCommitBarExpanded(false)
        setCommitCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  message: msg,
                  files: result.data.files ?? [],
                  status: 'done' as const,
                  hash: result.data.hash,
                }
              : c,
          ),
        )
        ctx.props.onCommit?.()
        setTimeout(() => {
          if (scope === gitScopeRef.current) setCommitState(null)
        }, 3000)
      } else {
        setCommitCards((prev) => prev.filter((c) => c.id !== cardId))
        setCommitState(null)
        ctx.systemCards.addSystemCard(
          result.data.message === 'No changes to commit'
            ? t('ide.chat.commitNoChanges', undefined, { defaultValue: 'No changes to commit.' })
            : result.data.message === 'A build is in progress'
              ? t('ide.chat.commitBuildInProgress', undefined, {
                  defaultValue: 'Wait for the build to finish before creating a Git commit.',
                })
              : t('ide.chat.commitError', undefined, { defaultValue: 'Failed to commit changes.' }),
        )
        void fetchPendingFiles()
        ctx.props.onCommit?.()
      }
    } catch (error) {
      if (scope !== gitScopeRef.current) return
      logger.warn('Commit request failed', { error })
      setCommitCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                status: 'error' as const,
                message: t('ide.chat.commitFailed', undefined, { defaultValue: 'Commit failed' }),
              }
            : c,
        ),
      )
      setCommitState({ status: 'error' })
      setTimeout(() => {
        if (scope === gitScopeRef.current) setCommitState(null)
      }, 3000)
    }
  }

  /**
   * Reverts a commit by hash.
   * @param hash - The commit hash to revert.
   * @returns The new revert commit's hash on success, else undefined.
   */
  const handleRevertCommit = async (hash: string): Promise<string | undefined> => {
    try {
      const result = await http.post<{
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
      // network/server failure — caller receives `undefined` and shows its own error UI
    }
    return undefined
  }

  return {
    commitState,
    setCommitState,
    pendingFiles,
    setPendingFiles,
    commitBarExpanded,
    setCommitBarExpanded,
    commitCards,
    setCommitCards,
    refreshGitStatus,
    debouncedFetchPendingFiles,
    handleFileRevert,
    handleCommit,
    handleRevertCommit,
    effects: {
      // #effect chat:git:1 — React's `useLayoutEffect` restarts the scope on
      // mount and on every project change, and again on unmount.
      1: () => {
        createEffect(
          on(
            () => ctx.props.projectId,
            () => {
              endGitScope()
              onCleanup(endGitScope)
            },
          ),
        )
      },
      // #effect chat:git:2 — fetch on turn boundaries and internal
      // refreshGitStatus() calls. Deliberately NOT gated on isLoading: mid-turn
      // updates must go through (the live per-write refresh is the debounced
      // path; this one settles the final state). React's deps compare the
      // VALUES of isLoading, gitStatusTick and projectId, so this effect must
      // skip the state-object churn that leaves those values unchanged (an
      // appended message, a streaming-status label): a fetch per change would
      // issue requests React never makes.
      2: () => {
        // React's dependency VALUES are compared, not the state object: an
        // appended message or a streaming-status label must not refetch. A memo
        // here would subscribe to the state during slice construction — before
        // this slice's own effects have first run — and Solid would then notify
        // it ahead of earlier-declared effects (inverting React's order), so the
        // comparison lives in the effect body.
        let previous: readonly [boolean, number, string] | undefined
        createEffect(() => {
          const next = [ctx.chat.isLoading(), gitStatusTick(), ctx.props.projectId] as const
          if (
            previous &&
            previous[0] === next[0] &&
            previous[1] === next[1] &&
            previous[2] === next[2]
          )
            return
          previous = next
          void fetchPendingFiles()
        })
      },
      // #effect chat:git:3 — fetch when the parent signals a file mutation
      // (edit, rename, delete), debounced so save+format coalesces into one
      // fetch after the final write. Skips the initial 0.
      3: () => {
        createEffect(() => {
          if (!ctx.props.gitStatusTick) return
          debouncedFetchPendingFiles()
        })
      },
      // #effect chat:git:4 — startup repairs, another editor, or another client
      // can commit without a local file event. Reconcile on return and while the
      // workspace is visible.
      4: () =>
        onMount(() => {
          const refresh = (): void => {
            if (document.visibilityState !== 'hidden') void fetchPendingFiles()
          }
          window.addEventListener('focus', refresh)
          document.addEventListener('visibilitychange', refresh)
          const interval = setInterval(refresh, 45_000)
          onCleanup(() => {
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refresh)
            clearInterval(interval)
            if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
            dropGitStatusRequests()
          })
        }),
    },
  }
}
