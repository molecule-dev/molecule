/**
 * React's `chat:mention` region of ChatPanel.tsx: the composer's `@` file
 * picker — the one-shot `/files-list` fetch whose result is cached across
 * keystrokes, the `gitStatusTick` that invalidates that cache, and picking a
 * row, which stages the file and lifts the `@` query out of the composer.
 *
 * @module
 */

import type { FileEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:mention` slice. */
export interface ChatMentionSlice {
  /** Opens the file picker for a query (the list is fetched once). */
  readonly openFilePicker: (query: string) => Promise<void>
  /** Attaches the picked entry and lifts the `@` query out of the composer. */
  readonly selectFileEntry: (entry: FileEntry) => void

  /** React's mount I/O for the region — none: it declares callbacks only. */
  mount(): void

  /** React's `#effect chat:mention:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/** The prefix the sandbox file list carries and the picker displays without. */
const WORKSPACE_PREFIX = '/workspace/'

/**
 * Creates the `chat:mention` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The picker's opener, the row picker and React's cache-invalidation effect.
 */
export function createChatMention(ctx: ChatContext): ChatMentionSlice {
  /** The cached flat file list from the sandbox — avoids re-fetching on every keystroke. */
  const allFilesRef: MutableRef<string[]> = { current: [] }
  /** Whether {@link allFilesRef} holds a successful fetch. */
  const allFilesFetchedRef: MutableRef<boolean> = { current: false }
  // The prop this slice's effect depends on, read through a derived cell so an
  // unrelated prop change does not re-run React's `[externalGitStatusTick]`.
  const externalGitStatusTick = $derived(ctx.props.gitStatusTick)

  /**
   * React's `openFilePicker`: fetches the file list once, then reuses it, and
   * opens the picker on the entries the query names.
   *
   * @param query - The text after the `@`.
   */
  const openFilePicker = async (query: string): Promise<void> => {
    // Fetch file list once, then reuse for subsequent keystrokes
    if (!allFilesFetchedRef.current) {
      try {
        const res = await ctx.env.http.get<{ files: string[] }>(
          `/projects/${ctx.props.projectId}/files-list`,
        )
        // Normalize: strip /workspace/ prefix for display, keep as relative paths
        allFilesRef.current = (res.data.files ?? []).map((file) =>
          file.startsWith(WORKSPACE_PREFIX) ? file.slice(WORKSPACE_PREFIX.length) : file,
        )
        allFilesFetchedRef.current = true
      } catch (_error) {
        // File list fetch failed — close the picker gracefully rather than showing stale entries
        ctx.popups.setFilePicker(null)
        return
      }
    }

    const entries: FileEntry[] = allFilesRef.current.map((file) => ({
      name: file,
      type: 'file' as const,
    }))
    ctx.popups.setFilePicker({ entries, query, selectedIdx: 0 })
  }

  /**
   * React's `selectFileEntry`: stages the file (once) and removes the `@query`
   * the picker replaced from the composer text.
   *
   * @param entry - The picked row.
   */
  const selectFileEntry = (entry: FileEntry): void => {
    const entryPath = '/' + entry.name
    ctx.popups.setAttachedFiles((prev) =>
      prev.some((file) => file.path === entryPath)
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
    const before = prev.slice(0, ctx.popups.mentionStart)
    const after = prev.slice(
      ctx.popups.mentionStart + 1 + (ctx.popups.filePicker?.query.length ?? 0),
    )
    ctx.composer.setInputValue(before + after)
    ctx.popups.setFilePicker(null)
  }

  return {
    openFilePicker,
    selectFileEntry,
    mount(): void {
      // React's region declares callbacks only; no mount I/O to repeat.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          // Invalidate the cached file list when we know the tree changed.
          void externalGitStatusTick
          allFilesFetchedRef.current = false
        })
      },
    },
  }
}
