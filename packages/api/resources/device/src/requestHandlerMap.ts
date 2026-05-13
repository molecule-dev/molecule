import type {
  createRequestHandler as CreateRequestHandler,
  MoleculeRequestHandler,
} from '@molecule/api-resource'

import * as authorizers from './authorizers/index.js'
import * as handlers from './handlers/index.js'
import { resource } from './resource.js'

type RequestHandlerCreator = typeof CreateRequestHandler

/**
 * Shape of the device request-handler map produced by `createRequestHandlerMap`.
 * Names match the route definitions in `routes.ts`. Exported so helpers that
 * accept the map (e.g. `mountDefaultDeviceRoutes`) can type their parameter
 * precisely instead of widening to `Record<string, MoleculeRequestHandler>`.
 */
export interface DeviceRequestHandlerMap {
  auth: MoleculeRequestHandler
  authUser: MoleculeRequestHandler
  del: MoleculeRequestHandler
  query: MoleculeRequestHandler
  read: MoleculeRequestHandler
  update: MoleculeRequestHandler
}

/**
 * Creates the full request handler map for the Device resource. Maps handler names (matching
 * route definitions) to Express middleware: `auth`, `authUser` (authorizers), and `del`, `query`,
 * `read`, `update` (CRUD handlers).
 * @param createRequestHandler - Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.
 * @returns A `DeviceRequestHandlerMap` of handler names to Express middleware.
 */
export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): DeviceRequestHandlerMap => ({
  auth: authorizers.auth(),
  authUser: authorizers.authUser(resource),
  del: createRequestHandler(handlers.del(resource)),
  query: createRequestHandler(handlers.query(resource)),
  read: createRequestHandler(handlers.read(resource)),
  update: createRequestHandler(handlers.update(resource)),
})
