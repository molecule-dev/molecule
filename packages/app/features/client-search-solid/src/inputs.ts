/**
 * The reactive shapes a Solid caller hands each primitive. Kept out of the
 * package's public surface (`src/index.ts` does not re-export this module): the
 * primitives' signatures carry them, and the exported names stay React's.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { ClientSearchDocument, ClientSearchIndex } from '@molecule/app-client-search'

/** The index a Solid caller passes to `useClientSearch`: the index, or an accessor of it. */
export type ClientSearchIndexInput<T extends ClientSearchDocument> =
  ClientSearchIndex<T> | null | Accessor<ClientSearchIndex<T> | null>

/** The documents a Solid caller hands a primitive: the list, or an accessor of it. */
export type DocumentsInput<T> = T[] | Accessor<T[]>
