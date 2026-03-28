/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { addTag } from './handlers/addTag.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { getBySlug } from './handlers/getBySlug.js'
import { list } from './handlers/list.js'
import { popular } from './handlers/popular.js'
import { read } from './handlers/read.js'
import { removeTag } from './handlers/removeTag.js'
import { update } from './handlers/update.js'

/** Handler map for tag resource routes. */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  popular,
  addTag,
  removeTag,
  getBySlug,
} as const
