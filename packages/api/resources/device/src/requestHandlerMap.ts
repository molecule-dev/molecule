import type {
  createRequestHandler as CreateRequestHandler,
  MoleculeRequestHandler,
} from '@molecule/api-resource'

import * as authorizers from './authorizers/index.js'
import * as handlers from './handlers/index.js'
import { resource } from './resource.js'

type RequestHandlerCreator = typeof CreateRequestHandler

/**
 * Creates the full request handler map for the Device resource. Maps handler names (matching
 * route definitions) to Express middleware: `auth`, `authUser` (authorizers), and `del`, `query`,
 * `read`, `update` (CRUD handlers).
 * @param createRequestHandler - Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.
 * @returns A record mapping handler names to Express middleware functions.
 */
export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): Record<string, MoleculeRequestHandler> => ({
  auth: authorizers.auth(),
  authUser: authorizers.authUser(resource),
  del: createRequestHandler(handlers.del(resource)),
  query: createRequestHandler(handlers.query(resource)),
  read: createRequestHandler(handlers.read(resource)),
  update: createRequestHandler(handlers.update(resource)),
})
