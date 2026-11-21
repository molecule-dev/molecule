/**
 * The reactive shapes an Angular caller hands each hook. Kept out of the
 * package's public surface (`src/index.ts` does not re-export this module): the
 * hooks' signatures carry them, and the exported names stay React's.
 *
 * @module
 */

import type { Signal } from '@angular/core'

import type { ClientSearchDocument, ClientSearchIndex } from '@molecule/app-client-search'

/** A value a hook accepts as itself, as a signal of it, or as a getter of it. */
export type MaybeSignal<T> = T | Signal<T> | (() => T)

/** The index an Angular caller passes to `useClientSearch`: the index, or a signal/getter of it. */
export type ClientSearchIndexInput<T extends ClientSearchDocument> =
  MaybeSignal<ClientSearchIndex<T> | null>

/** The documents an Angular caller hands a hook: the list, or a signal/getter of it. */
export type DocumentsInput<T> = MaybeSignal<T[]>
