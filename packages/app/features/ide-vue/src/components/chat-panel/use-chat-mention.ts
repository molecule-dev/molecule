/**
 * `chat:mention` — the `@` file picker, ported from React's `chat:mention`
 * region: the one-shot file-list fetch, the picker's entries and selecting one
 * into the staged attachments.
 *
 * The picker's state (`filePicker`, `mentionStart`) and the staged attachments
 * live in `chat:popups`, where React declares them; the composer's live text and
 * setter come from `chat:composer`. The fetched list is cached per mount and
 * invalidated whenever the host bumps the git-status tick.
 *
 * @module
 */

import { onMounted, watch } from 'vue'

import type { FileEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef } from './context.js'

/** What the `chat:mention` slice exposes. */
export interface ChatMentionSlice {
  /** Opens the `@` picker for a query (fetching the file list once). */
  readonly openFilePicker: (query: string) => Promise<void>
  /** Stages the picked file as an attachment. */
  readonly selectFileEntry: (entry: FileEntry) => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:mention:1` — invalidates the cached file list after a git change. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:mention` slice.
 *
 * @param ctx - The panel context (the HTTP client, the project id, the picker's
 *   state and the composer it edits).
 * @returns The mention slice.
 */
export function createChatMention(ctx: ChatCtx): ChatMentionSlice {
  /** Cached flat file list from the sandbox — avoids re-fetching on every keystroke. */
  const allFilesRef: MutableRef<string[]> = { current: [] }
  const allFilesFetchedRef: MutableRef<boolean> = { current: false }

  /**
   * Opens the picker for a query, fetching the project's file list once.
   *
   * @param query - The text after the `@` that narrows the rows.
   */
  const openFilePicker = async (query: string): Promise<void> => {
    // Fetch file list once, then reuse for subsequent keystrokes
    if (!allFilesFetchedRef.current) {
      try {
        const res = await ctx.env.http.get<{ files: string[] }>(
          `/projects/${ctx.props.projectId}/files-list`,
        )
        // Normalize: strip /workspace/ prefix for display, keep as relative paths
        allFilesRef.current = (res.data.files ?? []).map((f) =>
          f.startsWith('/workspace/') ? f.slice('/workspace/'.length) : f,
        )
        allFilesFetchedRef.current = true
      } catch (_error) {
        // File list fetch failed — close the picker gracefully rather than showing stale entries
        ctx.popups.setFilePicker(null)
        return
      }
    }

    const entries: FileEntry[] = allFilesRef.current.map((f) => ({
      name: f,
      type: 'file' as const,
    }))
    ctx.popups.setFilePicker({ entries, query, selectedIdx: 0 })
  }

  /**
   * Stages a picked file as an attachment and lifts its `@` query out of the
   * composer.
   *
   * @param entry - The picked file entry.
   */
  const selectFileEntry = (entry: FileEntry): void => {
    const entryPath = '/' + entry.name
    ctx.popups.setAttachedFiles((prev) =>
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
    const prev = ctx.composer.inputRef.current
    const mentionStart = ctx.popups.mentionStart.value
    const before = prev.slice(0, mentionStart)
    const after = prev.slice(mentionStart + 1 + (ctx.popups.filePicker.value?.query.length ?? 0))
    ctx.composer.setInputValue(before + after)
    ctx.popups.setFilePicker(null)
  }

  return {
    openFilePicker,
    selectFileEntry,
    effects: {
      1: () => {
        // The cached list must drop when the host knows the tree moved, so the
        // next `@` refetches. React's effect also runs once on mount (a no-op
        // for a cache that starts empty).
        onMounted(() => {
          allFilesFetchedRef.current = false
        })
        watch(
          () => ctx.props.gitStatusTick,
          () => {
            allFilesFetchedRef.current = false
          },
          { flush: 'post' },
        )
      },
    },
  }
}
