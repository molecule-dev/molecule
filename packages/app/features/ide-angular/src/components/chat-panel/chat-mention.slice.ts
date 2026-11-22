/**
 * React's `chat:mention` region of ChatPanel.tsx (lines 2754–2817): the `@`
 * file picker's one-time sandbox file-list fetch, its reuse across keystrokes,
 * the git-status tick that invalidates the cache, and the row that stages a
 * mentioned file into the composer.
 *
 * Router 1 is `#effect chat:mention:1` — React's `useEffect` clearing
 * `allFilesFetchedRef` whenever `externalGitStatusTick` changes, so the next
 * `@` refetches the tree. It runs on mount too (as React's does); the first
 * effect run only reads the tick, and the mount pass performs the body.
 *
 * `selectFileEntry` de-duplicates by path, lifts the typed `@query` out of the
 * composer and closes the picker — the exact edit React applies from the
 * captured `mentionStart` and `filePicker.query.length`.
 *
 * @module
 */

import { computed, inject, Injectable, Injector } from '@angular/core'

import type { FileEntry } from '@molecule/app-ide-panel-logic/panels'

import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'

/** The identifiers other slices and sections read from the `chat:mention` slice. */
export interface ChatMentionSlice {
  /** React's mount I/O for the region: the cache invalidation its effect performs on mount. */
  mount(): void

  /** React's `#effect chat:mention:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** Opens the `@` picker for a query (fetching the file list once). */
  readonly openFilePicker: (query: string) => Promise<void>
  /** Stages the picked file as an attachment. */
  readonly selectFileEntry: (entry: FileEntry) => void
}

/** React's `chat:mention` slice: the file-list cache and the picker's row action. */
@Injectable()
export class ChatMention implements ChatMentionSlice {
  /** The shared state, read for the props and the env (the HTTP client). */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effect in. */
  private readonly injector = inject(Injector)

  /** Cached flat file list from the sandbox — avoids re-fetching on every keystroke. */
  private readonly allFilesRef: { current: string[] } = { current: [] }

  /** Whether the cached file list has been fetched (React's `allFilesFetchedRef`). */
  private readonly allFilesFetchedRef: { current: boolean } = { current: false }

  /** The prop identity whose change invalidates the cache (React's effect dependency). */
  private readonly gitStatusTick = computed(() => this.state.props().gitStatusTick)

  /**
   * Fetches the sandbox file list once, then opens the picker over its entries
   * for the query. A failed fetch closes the picker instead of showing stale
   * rows.
   *
   * @param query - The text after the `@` the picker filters by.
   */
  readonly openFilePicker = async (query: string): Promise<void> => {
    // Fetch file list once, then reuse for subsequent keystrokes
    if (!this.allFilesFetchedRef.current) {
      try {
        const res = await this.state.env.http.get<{ files: string[] }>(
          `/projects/${this.state.props().projectId}/files-list`,
        )
        // Normalize: strip /workspace/ prefix for display, keep as relative paths
        this.allFilesRef.current = (res.data.files ?? []).map((f) =>
          f.startsWith('/workspace/') ? f.slice('/workspace/'.length) : f,
        )
        this.allFilesFetchedRef.current = true
      } catch (_error) {
        // File list fetch failed — close the picker gracefully rather than showing stale entries
        this.state.slice(ChatPopups).setFilePicker(null)
        return
      }
    }

    const entries: FileEntry[] = this.allFilesRef.current.map((f) => ({
      name: f,
      type: 'file' as const,
    }))
    this.state.slice(ChatPopups).setFilePicker({ entries, query, selectedIdx: 0 })
  }

  /**
   * Stages a picked file entry as an attachment (one chip per path) and lifts
   * the `@query` it was typed for out of the composer.
   *
   * @param entry - The file picker's chosen entry.
   */
  readonly selectFileEntry = (entry: FileEntry): void => {
    const popups = this.state.slice(ChatPopups)
    const composer = this.state.slice(ChatComposer)
    const entryPath = '/' + entry.name
    popups.setAttachedFiles((prev) =>
      prev.some((f) => f.path === entryPath)
        ? prev
        : [
            ...prev,
            {
              path: entryPath,
              filename: entry.name.split('/').pop() ?? entry.name,
              mediaType: 'text/plain',
              size: entry.size ?? 0,
            },
          ],
    )
    const prev = composer.inputRef.current
    const mentionStart = popups.mentionStart()
    const before = prev.slice(0, mentionStart)
    const after = prev.slice(mentionStart + 1 + (popups.filePicker()?.query.length ?? 0))
    composer.setInputValue(before + after)
    popups.setFilePicker(null)
  }

  /**
   * React's mount-pass body: the invalidation its effect performs on mount.
   */
  mount(): void {
    this.invalidateFileListCache()
  }

  /** Registers React's git-status invalidation effect; its first run is the mount pass. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        // Read so a tick change re-runs the effect, as React's dep list does.
        this.gitStatusTick()
        if (skip) return
        this.invalidateFileListCache()
      })
    },
  }

  /** Invalidate the cached file list when we know the tree changed. */
  private invalidateFileListCache(): void {
    this.allFilesFetchedRef.current = false
  }
}
