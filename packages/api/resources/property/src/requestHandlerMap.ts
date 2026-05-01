/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { createAmenity } from './handlers/createAmenity.js'
import { createPhoto } from './handlers/createPhoto.js'
import { createUnit } from './handlers/createUnit.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { listAmenities } from './handlers/listAmenities.js'
import { listPhotos } from './handlers/listPhotos.js'
import { listUnits } from './handlers/listUnits.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/** Handler map keyed by route handler name. */
export const requestHandlerMap = {
  create,
  createAmenity,
  createPhoto,
  createUnit,
  del,
  list,
  listAmenities,
  listPhotos,
  listUnits,
  read,
  update,
} as const
