/**
 * The reactive shapes a Svelte caller hands each hook. Kept out of the package's
 * public surface (`src/index.ts` does not re-export this module): the hooks'
 * signatures carry them, and the exported names stay React's.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { ClientSearchDocument, ClientSearchIndex } from '@molecule/app-client-search'

/** The index a Svelte caller passes to `useClientSearch`: the index or a store of it. */
export type ClientSearchIndexInput<T extends ClientSearchDocument> =
  ClientSearchIndex<T> | null | Readable<ClientSearchIndex<T> | null>

/** The documents a Svelte caller hands a hook: the list or a store of it. */
export type DocumentsInput<T> = T | Readable<T>

/** Options a Svelte caller hands a hook: the object or a store of it. */
export type OptionsInput<T> = T | Readable<T>
