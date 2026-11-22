/**
 * React's second `chat:git` region of ChatPanel.tsx (lines 2266–2361): the
 * uncommitted-files bar's data. A status fetch is scoped to the project and
 * tagged with a request generation, so an answer that lands after a newer
 * request (or after the project changed) changes nothing; file mutations
 * coalesce through a 400 ms debounce; and the bar reconciles on focus, on
 * visibility and every 45 s so commits made elsewhere still appear.
 *
 * The commit actions themselves (React's third and fourth `chat:git` regions)
 * belong to unit U15 and stay stubs; their state cells live here because this
 * region is what resets and refills them.
 *
 * @module
 */

import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

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

/** The identifiers other slices and sections read from the `chat:git` slice. */
export interface ChatGitSlice {
  /** The commit attempt's state, or null. */
  readonly commitState: CommitState | null
  /** Sets the commit attempt's state (unit U15's commit actions write it). */
  readonly setCommitState: ChatSetState<CommitState | null>
  /** The uncommitted files, or null when the bar is hidden. */
  readonly pendingFiles: PendingFileEntry[] | null
  /** Sets the uncommitted files (the status fetch writes it). */
  readonly setPendingFiles: ChatSetState<PendingFileEntry[] | null>
  /** Whether the commit bar is expanded. */
  readonly commitBarExpanded: boolean
  /** Expands or collapses the commit bar. */
  readonly setCommitBarExpanded: ChatSetState<boolean>
  /** The commit cards the timeline renders. */
  readonly commitCards: CommitCard[]
  /** Sets the commit cards. */
  readonly setCommitCards: ChatSetState<CommitCard[]>
  /** Bumps the git-status refresh tick. */
  readonly refreshGitStatus: () => void
  /** Wraps the host's file revert and refreshes git status. */
  readonly handleFileRevert: (path: string, content: string) => Promise<void>
  /** Commits the pending files. */
  readonly handleCommit: () => Promise<void>
  /** Reverts a commit and returns the new commit hash, when the server made one. */
  readonly handleRevertCommit: (hash: string) => Promise<string | undefined>

  /** React's mount I/O for the region: none — its effects are declared here. */
  mount(): void

  /** React's `#effect chat:git:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/** The git-status endpoint's answer. */
interface GitStatusResponse {
  /** The uncommitted files. */
  files: PendingFileEntry[]
}

/**
 * Creates the `chat:git` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The commit/pending state, the fetch machinery and effects 1–4.
 */
export function createChatGit(ctx: ChatContext): ChatGitSlice {
  let commitState = $state.raw<CommitState | null>(null)
  let pendingFiles = $state.raw<PendingFileEntry[] | null>(null)
  let commitBarExpanded = $state(false)
  let commitCards = $state.raw<CommitCard[]>([])
  let gitStatusTick = $state(0)
  // The project whose state the bar holds. React keeps it in state so the
  // render-phase reset below runs when the prop changes; nothing renders it.
  let gitProjectId = ctx.props.projectId
  // The props this slice's effects depend on, read through derived cells: the
  // props object invalidates as a whole when the host changes any prop, and a
  // derived re-notifies only when ITS value changed — React's per-dependency
  // effects, not one re-run per unrelated prop.
  const liveProjectId = $derived(ctx.props.projectId)
  const externalGitStatusTick = $derived(ctx.props.gitStatusTick)

  /**
   * Bumps the refresh tick the status effect listens to.
   *
   * React's `setGitStatusTick` only SCHEDULES the render whose effect fetches,
   * so a caller that awaits a host write and then toggles undo (the tool card's
   * revert, and /undo's loop) reaches its `POST /tool-call-undo` before the
   * `GET /git-status`. Bumping the state flushes its effect in the same
   * microtask, which would issue the fetch first. The tick therefore waits two
   * microtasks: the caller's `await` continuation is queued by the promise that
   * resolves AFTER the first one we queue here, and the state write in the
   * first would still flush its effect synchronously inside it — so the outer
   * one lets the caller continue, and the inner one then bumps the tick.
   */
  const refreshGitStatus = (): void => {
    queueMicrotask(() => {
      queueMicrotask(() => {
        gitStatusTick += 1
      })
    })
  }

  /** React's `setCommitState`. */
  const setCommitState: ChatSetState<CommitState | null> = (value) => {
    commitState = resolveState(commitState, value)
  }
  /** React's `setPendingFiles`. */
  const setPendingFiles: ChatSetState<PendingFileEntry[] | null> = (value) => {
    pendingFiles = resolveState(pendingFiles, value)
  }
  /** React's `setCommitBarExpanded`. */
  const setCommitBarExpanded: ChatSetState<boolean> = (value) => {
    commitBarExpanded = resolveState(commitBarExpanded, value)
  }
  /** React's `setCommitCards`. */
  const setCommitCards: ChatSetState<CommitCard[]> = (value) => {
    commitCards = resolveState(commitCards, value)
  }

  // Generation counters: a git request remembers the generation it started in
  // and drops its result when the counter has moved on. Ending a scope (another
  // project, an unmount) moves it.
  const gitScopeRef: MutableRef<number> = { current: 0 }
  /** Ends the current request scope, so its answers are dropped. */
  const endGitScope = (): void => {
    gitScopeRef.current++
  }
  const gitStatusRequestRef: MutableRef<number> = { current: 0 }
  /** Drops the answers of every request in flight. */
  const dropGitStatusRequests = (): void => {
    gitStatusRequestRef.current++
  }

  /**
   * Reads the project's uncommitted files once.
   *
   * @param projectId - The project to read (React closes over its render's id).
   * @returns A promise resolved when the answer was applied or dropped.
   */
  const fetchPendingFiles = (projectId: string = liveProjectId): Promise<void> => {
    const scope = gitScopeRef.current
    const request = ++gitStatusRequestRef.current
    return ctx.env.http
      .get<GitStatusResponse>(`/projects/${projectId}/git-status`)
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

  // Debounced version — coalesces rapid ticks (e.g. save → format, or an AI
  // write burst mid-turn) into a single fetch after the last write settles.
  const gitFetchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }
  /** Schedules one status fetch 400 ms after the last file mutation. */
  const debouncedFetchPendingFiles = (): void => {
    if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
    gitFetchTimerRef.current = setTimeout(() => {
      gitFetchTimerRef.current = null
      void fetchPendingFiles()
    }, 400)
  }
  // Expose to the chat slice's file-change wrapper: AI writes streaming in
  // mid-turn refresh the bar live instead of waiting for the turn to end.
  ctx.chat.debouncedFetchPendingFilesRef.current = debouncedFetchPendingFiles

  return {
    get commitState(): CommitState | null {
      return commitState
    },
    setCommitState,
    get pendingFiles(): PendingFileEntry[] | null {
      return pendingFiles
    },
    setPendingFiles,
    get commitBarExpanded(): boolean {
      return commitBarExpanded
    },
    setCommitBarExpanded,
    get commitCards(): CommitCard[] {
      return commitCards
    },
    setCommitCards,
    refreshGitStatus,
    async handleFileRevert(path: string, content: string): Promise<void> {
      // Undo/redo writes the file back through the host, then settles the bar.
      await ctx.props.onFileRevert?.(path, content)
      refreshGitStatus()
    },
    async handleCommit(): Promise<void> {
      const scope = gitScopeRef.current
      // An older status response must not restore a pre-commit count.
      gitStatusRequestRef.current++
      const projectId = liveProjectId
      setCommitState({ status: 'committing' })
      const cardId = `commit-${Date.now()}`
      setCommitCards((previous) => [
        ...previous,
        { id: cardId, message: '', files: [], timestamp: Date.now(), status: 'running' },
      ])
      try {
        const result = await ctx.env.http.post<{
          ok: boolean
          committed: boolean
          message?: string
          files?: string[]
          hash?: string
        }>(`/projects/${projectId}/commit`)
        if (scope !== gitScopeRef.current) return
        if (result.data.committed) {
          gitStatusRequestRef.current++
          const message =
            result.data.message ??
            ctx.env.t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
          setCommitState({ status: 'committed', message })
          setPendingFiles(null)
          setCommitBarExpanded(false)
          setCommitCards((previous) =>
            previous.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    message,
                    files: result.data.files ?? [],
                    status: 'done' as const,
                    hash: result.data.hash,
                  }
                : card,
            ),
          )
          ctx.props.onCommit?.()
          setTimeout(() => {
            if (scope === gitScopeRef.current) setCommitState(null)
          }, 3000)
        } else {
          setCommitCards((previous) => previous.filter((card) => card.id !== cardId))
          setCommitState(null)
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
        setCommitCards((previous) =>
          previous.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  status: 'error' as const,
                  message: ctx.env.t('ide.chat.commitFailed', undefined, {
                    defaultValue: 'Commit failed',
                  }),
                }
              : card,
          ),
        )
        setCommitState({ status: 'error' })
        setTimeout(() => {
          if (scope === gitScopeRef.current) setCommitState(null)
        }, 3000)
      }
    },
    async handleRevertCommit(hash: string): Promise<string | undefined> {
      try {
        const result = await ctx.env.http.post<{
          ok: boolean
          message?: string
          hash?: string
          error?: string
        }>(`/projects/${liveProjectId}/revert-commit`, { hash })
        if (result.data.ok) {
          ctx.props.onCommit?.()
          return result.data.hash
        }
      } catch (_error) {
        // network/server failure — the caller receives `undefined` and shows its
        // own error UI (React's documented swallow).
      }
      return undefined
    },
    mount(): void {
      // React's region declares state and effects; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        // React's render-phase reset for a project change, then its layout
        // effect that ends the old scope. A layout effect runs before every
        // passive effect, so the reset precedes this region's first fetch.
        $effect.pre(() => {
          const projectId = liveProjectId
          if (gitProjectId !== projectId) {
            gitProjectId = projectId
            pendingFiles = null
            commitState = null
            commitCards = []
            commitBarExpanded = false
          }
          endGitScope()
          return () => {
            // React's cleanups all run before its setups, so its drop-answers
            // cleanup precedes the new project's fetch. Svelte re-runs one
            // effect at a time (this layout effect, then the passive fetch), so
            // the drop happens here — before effect 2's fetch — instead of in
            // effect 4, which would invalidate the request the new project just
            // started. An unmount drops the answers the same way.
            endGitScope()
            dropGitStatusRequests()
          }
        })
      },
      2: (): void => {
        $effect(() => {
          // Fetch on turn boundaries and internal refreshGitStatus() calls.
          // Deliberately NOT gated on isLoading: mid-turn updates must go
          // through (the live per-write refresh is the debounced path); this
          // one settles the final state.
          void ctx.chat.isLoading
          void gitStatusTick
          void fetchPendingFiles()
        })
      },
      3: (): void => {
        $effect(() => {
          // Fetch when the parent signals a file mutation (edit, rename,
          // delete) — debounced so save+format coalesces into one fetch after
          // the final write.
          const tick = externalGitStatusTick
          if (!tick) return
          debouncedFetchPendingFiles()
        })
      },
      4: (): void => {
        $effect(() => {
          // Startup repairs, another editor, or another client can commit
          // without a local file event. Reconcile on return and while the
          // workspace is visible. Reading the project id here re-registers the
          // listeners on a project change, as React's dependency does.
          const projectId = liveProjectId
          /** Refreshes unless the page is hidden. */
          const refresh = (): void => {
            if (document.visibilityState !== 'hidden') void fetchPendingFiles(projectId)
          }
          window.addEventListener('focus', refresh)
          document.addEventListener('visibilitychange', refresh)
          const interval = setInterval(refresh, 45_000)
          return () => {
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refresh)
            clearInterval(interval)
            if (gitFetchTimerRef.current) clearTimeout(gitFetchTimerRef.current)
          }
        })
      },
    },
  }
}
