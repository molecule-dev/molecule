/**
 * Loads the IDE chat's session usage while its summary is visible — the
 * Svelte counterpart of `@molecule/app-ide-react`'s `useContextSessionUsage`
 * (see that file for the design notes). The loaded state feeds
 * `ContextSessionUsage`'s props.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, readable, readonly, writable } from 'svelte/store'

import type { ChatUsageTokens } from '@molecule/app-ide-panel-logic/panels'
import { useHttpClient } from '@molecule/app-svelte'

/** The usage the hook loads from `GET /projects/:id/chat-usage`. */
export interface SessionUsage extends ChatUsageTokens {
  /** The owner's remaining-allowance percent spent, when the plan meters it. */
  allowancePercent?: number | null
  /** When the allowance window rolls over (epoch milliseconds). */
  allowanceResetAt?: number | null
  /** The allowance's window: monthly against the billing period, or daily. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model the conversation ran on. */
  model?: string
  /** Whether the conversation's turn is streaming right now. */
  streaming?: boolean
}

/** Props for `ContextSessionUsage` — the React prop names, React's own contract. */
export interface ContextSessionUsageProps {
  /** The loaded usage, or `null` before the first reply. */
  data: SessionUsage | null
  /** Whether a load is in flight (shown only while there is nothing to show). */
  loading: boolean
  /** Whether the last refresh failed (stated on the allowance row). */
  failed: boolean
}

/** How often the hook re-fetches while its summary is visible. */
const REFRESH_INTERVAL_MS = 15_000

/**
 * Whether a value is a readable store (the read half of the Svelte store
 * contract). Each argument may arrive as one, so a changed value reaches the
 * same mount the way a React re-render does.
 *
 * @param value - The value, or a store of it.
 * @returns True for a store.
 */
function isStore<T>(value: T | Readable<T>): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
}

/**
 * Loads the existing conversation totals only while their summary is visible.
 * Call it during component init (a component's `<script>` or a `.svelte.ts`
 * module's init), where Svelte's lifecycle works and an `HttpProvider` in the
 * tree supplies the client. Pass any argument as a readable store when it can
 * change: the new value re-fetches on the same mount, the Svelte counterpart
 * of React re-rendering the hook with new arguments. The fetch also repeats
 * every 15 seconds while visible, and `refresh()` re-fetches at once. A
 * cancellation belongs to hover/navigation cleanup; a real failure is
 * rendered with retry rather than replacing missing usage with zero.
 *
 * @param projectId - The project whose chat usage to load, or a store of it.
 * @param conversationId - The conversation to scope the totals to, or a store
 *   of it (`null` scopes to the whole project).
 * @param active - Whether the summary is visible, or a store of it.
 * @returns The loaded state and `refresh()`.
 */
export function useContextSessionUsage(
  projectId: string | undefined | Readable<string | undefined>,
  conversationId: string | null | undefined | Readable<string | null | undefined>,
  active: boolean | Readable<boolean>,
): {
  data: Readable<SessionUsage | null>
  loading: Readable<boolean>
  failed: Readable<boolean>
  refresh: () => void
} {
  const http = useHttpClient()
  const data = writable<SessionUsage | null>(null)
  const loading = writable(false)
  const failed = writable(false)
  const revision = writable(0)

  const project = isStore(projectId) ? projectId : readable(projectId)
  const conversation = isStore(conversationId) ? conversationId : readable(conversationId)
  const activeSource = isStore(active) ? active : readable(active)

  let currentController: AbortController | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let scheduled = false

  /** Tears the current fetch loop down (idempotent). */
  const teardown = (): void => {
    currentController?.abort()
    currentController = undefined
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  /**
   * Starts one fetch loop for the resolved arguments: an immediate load, then
   * a load every 15 seconds, ignoring a reply the cleanup already cancelled.
   * @param projectValue - The project whose chat usage to load.
   * @param conversationValue - The conversation to scope the totals to.
   */
  const start = (projectValue: string, conversationValue: string | null | undefined): void => {
    teardown()
    const controller = new AbortController()
    currentController = controller
    let pending = false

    /**
     * Fetches once, collapsing overlapping ticks the way React's `pending`
     * guard does.
     */
    const load = async (): Promise<void> => {
      if (pending) return
      pending = true
      loading.set(true)
      failed.set(false)
      try {
        const query = conversationValue
          ? `?conversationId=${encodeURIComponent(conversationValue)}`
          : ''
        const response = await http.get<SessionUsage>(
          `/projects/${encodeURIComponent(projectValue)}/chat-usage${query}`,
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) {
          data.set(response.data)
          loading.set(false)
          failed.set(false)
        }
      } catch (_error) {
        // Cancellation belongs to hover/navigation cleanup; real failures are
        // rendered with retry rather than replacing missing usage with zero.
        if (!controller.signal.aborted) {
          loading.set(false)
          failed.set(true)
        }
      } finally {
        pending = false
      }
    }

    void load()
    timer = setInterval(() => void load(), REFRESH_INTERVAL_MS)
  }

  /**
   * Restarts once per burst of store changes: every source calls back during
   * init and on a change, and the restart reads the latest of all of them,
   * the way React's effect runs once for a changed dependency list.
   */
  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      let projectValue: string | undefined
      let conversationValue: string | null | undefined
      let activeValue = false
      project.subscribe((value) => {
        projectValue = value
      })()
      conversation.subscribe((value) => {
        conversationValue = value
      })()
      activeSource.subscribe((value) => {
        activeValue = value
      })()
      if (!projectValue || !activeValue) {
        teardown()
        return
      }
      start(projectValue, conversationValue)
    })
  }

  const stops = [
    project.subscribe(schedule),
    conversation.subscribe(schedule),
    activeSource.subscribe(schedule),
    revision.subscribe(schedule),
  ]
  onDestroy(() => {
    for (const stop of stops) stop()
    teardown()
  })

  return {
    data: readonly(data),
    loading: readonly(loading),
    failed: readonly(failed),
    refresh: (): void => {
      revision.update((previous) => previous + 1)
    },
  }
}
