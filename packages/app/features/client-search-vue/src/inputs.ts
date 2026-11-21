/**
 * The reactive shapes a Vue caller hands each composable, and the mutable holder
 * the session exposes for the input element. Kept out of the package's public
 * surface (`src/index.ts` does not re-export this module): the composables'
 * signatures carry them, and the exported names stay React's.
 *
 * @module
 */

import type { MaybeRefOrGetter } from 'vue'

import type { ClientSearchDocument, ClientSearchIndex } from '@molecule/app-client-search'

/** The index a Vue caller passes to `useClientSearch`: the index itself, or a ref/getter of it. */
export type ClientSearchIndexInput<T extends ClientSearchDocument> =
  MaybeRefOrGetter<ClientSearchIndex<T> | null>
