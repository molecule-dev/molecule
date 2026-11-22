/**
 * React's `chat:git` status region of ChatPanel.tsx (lines 2267–2362, the
 * second of four regions): the uncommitted-files fetch and the triggers that
 * refetch it — a turn boundary, an internal refresh, the host's file-mutation
 * tick, and a periodic / visibility refresh — plus the generation counters that
 * drop a stale answer and the project-change reset.
 *
 * The first fetch is `#effect chat:git:2`'s first run, which is where React
 * performs it, so the request keeps React's position after the project settings
 * read and before the skills seed. The region's other three parts — the file
 * revert, the commit action and the commit revert — live here too.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** One uncommitted file, as the git status lists it (React's inline shape). */
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

/** The commit bar's in-flight outcome (React's inline shape). */
export interface CommitState {
  /** Where the commit is. */
  status: 'committing' | 'committed' | 'error'
  /** The server's message for an error or a summary. */
  message?: string
}

/** The identifiers other slices and sections read from the `chat:git` slice. */
export interface ChatGitSlice {
  /** React's mount I/O for the region (its request runs on the first effect run). */
  mount(): void

  /** React's `#effect chat:git:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }

  /** The commit bar's in-flight outcome, or `null`. */
  readonly commitState: () => CommitState | null
  /** The uncommitted files, or `null` before the first status arrives. */
  readonly pendingFiles: () => PendingFile[] | null
  /** Whether the commit bar's file list is expanded. */
  readonly commitBarExpanded: () => boolean
  /** Sets the commit bar's expansion. */
  readonly setCommitBarExpanded: ChatSetState<boolean>
  /** The commit cards in the timeline. */
  readonly commitCards: () => CommitCard[]
  /** Sets the commit cards. */
  readonly setCommitCards: ChatSetState<CommitCard[]>
  /** Re-fetches the git status. */
  readonly refreshGitStatus: () => void
  /** Writes a file back and refreshes the git status. */
  readonly handleFileRevert: (path: string, content: string) => Promise<void>
  /** Commits the working tree. */
  readonly handleCommit: () => Promise<void>
  /** Reverts a commit by hash; returns the new commit's hash on success. */
  readonly handleRevertCommit: (hash: string) => Promise<string | undefined>
}

/** React's `chat:git` slice: the status fetch plus the region's commit actions. */
@Injectable()
export class ChatGit implements ChatGitSlice {
  /** The shared state, read for the project and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Clears the region's listeners and timers when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The commit bar's in-flight outcome, or `null`. */
  readonly commitState = signal<CommitState | null>(null)

  /** The uncommitted files, or `null` before the first status arrives. */
  readonly pendingFiles = signal<PendingFile[] | null>(null)

  /** Whether the commit bar's file list is expanded. */
  readonly commitBarExpanded = signal(false)

  /** The commit cards in the timeline. */
  readonly commitCards = signal<CommitCard[]>([])

  /** The internal refresh ticker, which re-runs the status fetch (React's state). */
  private readonly gitStatusTick = signal(0)

  /** The host's file-mutation tick (React's `externalGitStatusTick` prop). */
  private readonly externalGitStatusTick = computed(() => this.state.props().gitStatusTick)

  /** The project the status belongs to (React's `projectId`). */
  private readonly projectId = computed(() => this.state.props().projectId)

  // Generation counters: a git request remembers the generation it started in
  // and drops its result when the counter has moved on. Ending a scope (another
  // project, an unmount) moves it.
  private readonly gitScopeRef: { current: number } = { current: 0 }

  /** Moves the git scope on, so in-flight answers are dropped. */
  private readonly endGitScope = (): void => {
    this.gitScopeRef.current++
  }

  /** The request generation, so only the newest status answer applies. */
  private readonly gitStatusRequestRef: { current: number } = { current: 0 }

  /** Moves the request generation on, dropping every in-flight answer. */
  private readonly dropGitStatusRequests = (): void => {
    this.gitStatusRequestRef.current++
  }

  /** The project the region's state currently belongs to (React's `gitProjectId`). */
  private gitProjectId: string | null = null

  /** The pending debounced fetch, if one is scheduled (React's timer ref). */
  private gitFetchTimerRef: ReturnType<typeof setTimeout> | null = null

  /** Clears the periodic / visibility listeners installed by effect 4. */
  private stopGitRefresh: () => void = () => {}

  /**
   * Set when the panel unmounts. The status refresh's listeners are per mount,
   * and an effect run that lands during teardown must not leave one behind.
   */
  private gitRefreshDestroyed = false

  /** The debounced fetch, exposed to the chat slice's file-change wrapper. */
  private readonly debouncedFetchPendingFiles = (): void => {
    if (this.gitFetchTimerRef) clearTimeout(this.gitFetchTimerRef)
    this.gitFetchTimerRef = setTimeout(() => {
      this.gitFetchTimerRef = null
      void this.fetchPendingFiles()
    }, 400)
  }

  /** React's mount I/O for the region: its request runs on the first effect run. */
  mount(): void {
    // `chat:git` has no mount I/O outside its effects: the first status fetch is
    // effect 2's first run, which keeps React's request position.
  }

  /**
   * Fetches the working tree's uncommitted files, dropping the answer when a
   * newer request or a newer scope has superseded it.
   *
   * @returns A promise that settles once the fetch is handled.
   */
  private fetchPendingFiles(): Promise<void> {
    // A destroyed panel has no bar to update, and React's effect cleanup drops
    // its pending request; a late answer must not log into a later mount.
    if (this.gitRefreshDestroyed) return Promise.resolve()
    const scope = this.gitScopeRef.current
    const request = ++this.gitStatusRequestRef.current
    return this.state.env.http
      .get<{ files: { path: string; status: string; additions?: number; deletions?: number }[] }>(
        `/projects/${this.projectId()}/git-status`,
      )
      .then((res) => {
        if (
          !this.gitRefreshDestroyed &&
          scope === this.gitScopeRef.current &&
          request === this.gitStatusRequestRef.current
        )
          this.pendingFiles.set(res.data.files.length > 0 ? res.data.files : null)
      })
      .catch((error: unknown) => {
        // Transient: the bar re-fetches on every turn boundary and file change.
        if (
          !this.gitRefreshDestroyed &&
          scope === this.gitScopeRef.current &&
          request === this.gitStatusRequestRef.current
        ) {
          logger.debug('chat-panel: git-status fetch failed; pending-files bar hidden', { error })
          this.pendingFiles.set(null)
        }
      })
  }

  /** Sets the commit bar's expansion (value or updater). */
  readonly setCommitBarExpanded: ChatSetState<boolean> = (next) => {
    this.commitBarExpanded.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the commit cards (value or updater). */
  readonly setCommitCards: ChatSetState<CommitCard[]> = (next) => {
    this.commitCards.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /**
   * Clears the region's state when the panel moves to another project, the way
   * React resets it while rendering.
   *
   * @param projectId - The project the panel now shows.
   */
  private resetForProject(projectId: string): void {
    if (this.gitProjectId === projectId) return
    this.gitProjectId = projectId
    this.pendingFiles.set(null)
    this.commitState.set(null)
    this.commitCards.set([])
    this.commitBarExpanded.set(false)
  }

  /** Re-fetches the git status (React's `refreshGitStatus`). */
  refreshGitStatus(): void {
    // React's `setState` schedules the render's effect; defer the tick by one
    // microtask so a caller that awaits a host write and then toggles undo
    // reaches `POST /tool-call-undo` before this refetch's `GET /git-status`
    // (a same-tick write would flush the effect ahead of the caller's own
    // continuation and reverse React's order).
    queueMicrotask(() => this.gitStatusTick.update((tick) => tick + 1))
  }

  /**
   * Registers React's four git effects in their marker order.
   */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // React's layout effect: reset on a project change, then end the old
        // scope so an answer started for it is dropped.
        this.resetForProject(this.projectId())
        this.endGitScope()
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Fetch on turn boundaries, internal refreshes and a project change —
        // React's `[isLoading, gitStatusTick, fetchPendingFiles]`.
        this.gitStatusTick()
        this.state.slice(ChatChat).isLoading()
        this.projectId()
        void this.fetchPendingFiles()
      })
    },
    3: (): void => {
      registerChatEffect(this.injector, () => {
        // Fetch when the parent signals a file mutation (edit, rename, delete) —
        // debounced so save+format coalesces into one fetch after the final write.
        const tick = this.externalGitStatusTick()
        this.projectId()
        if (!tick) return
        this.debouncedFetchPendingFiles()
      })
    },
    4: (): void => {
      registerChatEffect(this.injector, () => {
        // Startup repairs, another editor, or another client can commit without a
        // local file event. Reconcile on return and while the workspace is visible.
        this.projectId()
        if (this.gitRefreshDestroyed) return
        this.stopGitRefresh()
        if (this.gitFetchTimerRef) clearTimeout(this.gitFetchTimerRef)
        /**
         * Refreshes the status when the workspace is visible.
         */
        const refresh = (): void => {
          if (document.visibilityState !== 'hidden') void this.fetchPendingFiles()
        }
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', refresh)
        const interval = setInterval(refresh, 45_000)
        this.stopGitRefresh = () => {
          window.removeEventListener('focus', refresh)
          document.removeEventListener('visibilitychange', refresh)
          clearInterval(interval)
        }
      })
    },
  }

  /** Wires the chat slice's file-change nudge and the unmount cleanup. */
  constructor() {
    // Expose the debounced fetch to the chat slice's file-change wrapper, which
    // refreshes the uncommitted-files bar live while a turn streams.
    this.state.slice(ChatChat).debouncedFetchPendingFilesRef.current =
      this.debouncedFetchPendingFiles
    this.destroyRef.onDestroy(() => {
      this.gitRefreshDestroyed = true
      this.stopGitRefresh()
      if (this.gitFetchTimerRef) clearTimeout(this.gitFetchTimerRef)
      this.dropGitStatusRequests()
      this.endGitScope()
      this.state.slice(ChatChat).debouncedFetchPendingFilesRef.current = null
    })
  }

  /** Writes a file back and refreshes the git status. */
  async handleFileRevert(path: string, content: string): Promise<void> {
    await this.state.props().onFileRevert?.(path, content)
    this.refreshGitStatus()
  }

  /** Commits the working tree. */
  async handleCommit(): Promise<void> {
    const t = this.state.env.t
    const http = this.state.env.http
    const projectId = this.projectId()
    const scope = this.gitScopeRef.current
    // An older status response must not restore a pre-commit count.
    this.gitStatusRequestRef.current++
    this.commitState.set({ status: 'committing' })
    const cardId = `commit-${Date.now()}`
    this.commitCards.update((prev) => [
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
      }>(`/projects/${projectId}/commit`)
      if (scope !== this.gitScopeRef.current) return
      if (result.data.committed) {
        this.gitStatusRequestRef.current++
        const msg =
          result.data.message ?? t('ide.chat.committed', undefined, { defaultValue: 'Committed' })
        this.commitState.set({ status: 'committed', message: msg })
        this.pendingFiles.set(null)
        this.commitBarExpanded.set(false)
        this.commitCards.update((prev) =>
          prev.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  message: msg,
                  files: result.data.files ?? [],
                  status: 'done' as const,
                  hash: result.data.hash,
                }
              : card,
          ),
        )
        this.state.props().onCommit?.()
        setTimeout(() => {
          if (scope === this.gitScopeRef.current) this.commitState.set(null)
        }, 3000)
      } else {
        this.commitCards.update((prev) => prev.filter((card) => card.id !== cardId))
        this.commitState.set(null)
        this.state.slice(ChatSystemCards).addSystemCard(
          result.data.message === 'No changes to commit'
            ? t('ide.chat.commitNoChanges', undefined, { defaultValue: 'No changes to commit.' })
            : result.data.message === 'A build is in progress'
              ? t('ide.chat.commitBuildInProgress', undefined, {
                  defaultValue: 'Wait for the build to finish before creating a Git commit.',
                })
              : t('ide.chat.commitError', undefined, { defaultValue: 'Failed to commit changes.' }),
        )
        void this.fetchPendingFiles()
        this.state.props().onCommit?.()
      }
    } catch (error) {
      if (scope !== this.gitScopeRef.current) return
      logger.warn('Commit request failed', { error })
      this.commitCards.update((prev) =>
        prev.map((card) =>
          card.id === cardId
            ? {
                ...card,
                status: 'error' as const,
                message: t('ide.chat.commitFailed', undefined, { defaultValue: 'Commit failed' }),
              }
            : card,
        ),
      )
      this.commitState.set({ status: 'error' })
      setTimeout(() => {
        if (scope === this.gitScopeRef.current) this.commitState.set(null)
      }, 3000)
    }
  }

  /** Reverts a commit by hash; returns the new commit's hash on success. */
  async handleRevertCommit(hash: string): Promise<string | undefined> {
    try {
      const result = await this.state.env.http.post<{
        ok: boolean
        message?: string
        hash?: string
        error?: string
      }>(`/projects/${this.projectId()}/revert-commit`, { hash })
      if (result.data.ok) {
        this.state.props().onCommit?.()
        return result.data.hash
      }
    } catch (_error) {
      // network/server failure — the caller receives `undefined` and shows its own error UI
    }
    return undefined
  }
}
