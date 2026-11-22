/**
 * Loads the IDE chat's session usage while its summary is visible — the
 * Angular counterpart of `@molecule/app-ide-react`'s `useContextSessionUsage`
 * (see that file for the design notes). The loaded state feeds
 * `ContextSessionUsage`'s inputs.
 *
 * @module
 */

import { DestroyRef, effect, inject, isSignal, type Signal, signal, untracked } from '@angular/core'

import { useHttpClient } from '@molecule/app-angular'

import type { SessionUsage } from '../parts/context-session-usage.component.js'

/** How often the hook re-fetches while its summary is visible. */
const REFRESH_INTERVAL_MS = 15_000

/**
 * Loads the existing conversation totals only while their summary is visible.
 * Call it in an injection context (a component field initializer or
 * constructor), where an `HttpProvider` in the tree supplies the client.
 * Pass any argument as a signal when it can change: the new value re-fetches
 * on the same host, the Angular counterpart of React re-rendering the hook
 * with new arguments. The fetch also repeats every 15 seconds while visible,
 * and `refresh()` re-fetches at once. A cancellation belongs to
 * hover/navigation cleanup; a real failure is rendered with retry rather
 * than replacing missing usage with zero.
 *
 * @param projectId - The project whose chat usage to load, or a signal of it.
 * @param conversationId - The conversation to scope the totals to, or a
 *   signal of it (`null` scopes to the whole project).
 * @param active - Whether the summary is visible, or a signal of it.
 * @returns The loaded state and `refresh()`.
 */
export function useContextSessionUsage(
  projectId: string | undefined | Signal<string | undefined>,
  conversationId: string | null | undefined | Signal<string | null | undefined>,
  active: boolean | Signal<boolean>,
): {
  data: Signal<SessionUsage | null>
  loading: Signal<boolean>
  failed: Signal<boolean>
  refresh: () => void
} {
  const http = useHttpClient()
  const data = signal<SessionUsage | null>(null)
  const loading = signal(false)
  const failed = signal(false)
  const revision = signal(0)

  let teardown: (() => void) | null = null

  effect(() => {
    // Tracked reads: the effect rebuilds on each change, the way React's
    // effect re-runs for a changed dependency. `revision` is read only to
    // subscribe — a bump re-fetches on the same mount.
    const project = isSignal(projectId) ? projectId() : projectId
    const conversation = isSignal(conversationId) ? conversationId() : conversationId
    const isActive = isSignal(active) ? active() : active
    void revision()
    untracked(() => {
      teardown?.()
      teardown = null
      if (!project || !isActive) return

      const controller = new AbortController()
      let pending = false

      /**
       * Fetches once, collapsing overlapping ticks the way React's `pending`
       * guard does, and ignores a reply the cleanup already cancelled.
       */
      const load = async (): Promise<void> => {
        if (pending) return
        pending = true
        loading.set(true)
        failed.set(false)
        try {
          const query = conversation ? `?conversationId=${encodeURIComponent(conversation)}` : ''
          const response = await http.get<SessionUsage>(
            `/projects/${encodeURIComponent(project)}/chat-usage${query}`,
            { signal: controller.signal },
          )
          if (!controller.signal.aborted) {
            data.set(response.data)
            loading.set(false)
            failed.set(false)
          }
        } catch (_error) {
          // Cancellation belongs to hover/navigation cleanup; real failures
          // are rendered with retry rather than replacing missing usage with
          // zero.
          if (!controller.signal.aborted) {
            loading.set(false)
            failed.set(true)
          }
        } finally {
          pending = false
        }
      }

      void load()
      const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS)
      teardown = () => {
        controller.abort()
        clearInterval(timer)
      }
    })
  })

  inject(DestroyRef).onDestroy(() => {
    teardown?.()
    teardown = null
  })

  return {
    data,
    loading,
    failed,
    refresh: (): void => {
      revision.update((previous) => previous + 1)
    },
  }
}
