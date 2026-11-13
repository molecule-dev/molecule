/**
 * `createSolidMemoryHistory`: a memory history for `<MemoryRouter history={…}>` that keeps
 * each entry's navigation state and location key, as React Router's memory router does.
 * Solid Router's own `createMemoryHistory()` stores only the URL of each entry, so the
 * state of an entry is gone after Back and every entry looks the same.
 *
 * @module
 */

import type { LocationChange } from '@solidjs/router'

import type { SolidMemoryEntry, SolidMemoryHistory } from './types.js'

const newKey = (): string => Math.random().toString(36).slice(2)

/**
 * Creates a memory history for a Solid `<MemoryRouter>`. Pass the same object to
 * `createSolidRouter({ history })` so the molecule router reads each entry's state and
 * key, and hears Back and Forward as pops.
 *
 * @param initialEntries - The starting entries; the last one is current. Defaults to `/`.
 * @returns The history, with the shape Solid's `MemoryRouter` takes.
 *
 * @example
 * ```tsx
 * const memory = createSolidMemoryHistory(['/start'])
 * <MemoryRouter history={memory} root={(props) => (
 *   <MoleculeProvider config={{ router: createSolidRouter({ history: memory }) }}>
 *     {props.children}
 *   </MoleculeProvider>
 * )} />
 * ```
 */
export const createSolidMemoryHistory = (initialEntries: string[] = ['/']): SolidMemoryHistory => {
  const entries: (SolidMemoryEntry & { value: string })[] = (
    initialEntries.length > 0 ? initialEntries : ['/']
  ).map((value) => ({ value, state: undefined, key: newKey() }))
  let index = entries.length - 1
  const listeners = new Set<(value: string) => void>()
  const notify = (): void => {
    for (const listener of [...listeners]) listener(entries[index].value)
  }

  const go = (delta: number): void => {
    // Clamped like Solid's own memory history (and React Router's).
    index = Math.max(0, Math.min(index + delta, entries.length - 1))
    notify()
  }

  return {
    get: () => entries[index].value,
    entry: () => ({ state: entries[index].state, key: entries[index].key }),
    set({ value, replace, state }: LocationChange) {
      const entry = { value, state, key: newKey() }
      if (replace) {
        entries[index] = entry
      } else {
        entries.splice(index + 1, entries.length - index, entry)
        index += 1
      }
      notify()
    },
    back: () => go(-1),
    forward: () => go(1),
    go,
    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
