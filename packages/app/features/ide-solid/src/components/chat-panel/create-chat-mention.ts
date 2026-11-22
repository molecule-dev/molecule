/**
 * `chat:mention` — the `@`-mention file picker: fetch the file list once, rank
 * the entries and attach the chosen file (React's `chat:mention` region and its
 * one effect, ported by U13).
 *
 * The file list is fetched once and reused across keystrokes; a git-status tick
 * invalidates it so the next `@` reads the moved tree, and a failed fetch closes
 * the picker rather than showing stale rows. Attaching an entry stages its
 * sandbox path as an attachment and lifts the typed `@query` out of the
 * composer.
 *
 * @module
 */

import { createEffect, on } from 'solid-js'

import type { FileEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:mention`. */
export interface ChatMentionSlice {
  /** Opens the file picker for a query (the list is fetched once). */
  openFilePicker: (query: string) => Promise<void>
  /** Attaches the picked entry and lifts the `@` query out of the composer. */
  selectFileEntry: (entry: FileEntry) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:mention`.
 * @param ctx - The inner ctx (the popups, composer and project the picker reads).
 * @returns The mention slice.
 */
export function createChatMention(ctx: ChatInnerCtx): ChatMentionSlice {
  /** Cached flat file list from the sandbox — avoids re-fetching on every keystroke. */
  const allFilesRef: MutableRef<string[]> = { current: [] }
  const allFilesFetchedRef: MutableRef<boolean> = { current: false }

  /**
   * Fetches the file list once, then opens the picker for the typed query.
   * @param query - The text typed after `@`.
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
   * Stages the picked entry as an attachment and lifts its `@query` from the
   * composer.
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
    const mentionStart = ctx.popups.mentionStart()
    const before = prev.slice(0, mentionStart)
    const after = prev.slice(mentionStart + 1 + (ctx.popups.filePicker()?.query.length ?? 0))
    ctx.composer.setInputValue(before + after)
    ctx.popups.setFilePicker(null)
  }

  return {
    openFilePicker,
    selectFileEntry,
    effects: {
      // #effect chat:mention:1 — invalidate the cached file list when we know
      // the tree changed. Runs on mount too, as React's effect does.
      1: () => {
        createEffect(
          on(
            () => ctx.props.gitStatusTick,
            () => {
              allFilesFetchedRef.current = false
            },
          ),
        )
      },
    },
  }
}
