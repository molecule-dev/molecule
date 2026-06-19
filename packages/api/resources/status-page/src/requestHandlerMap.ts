/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import type {
  createRequestHandler as CreateRequestHandler,
  MoleculeRequestHandler,
} from '@molecule/api-resource'

import { requireAdmin } from './authorizers/index.js'
import * as handlers from './handlers/index.js'
import { resource } from './resource.js'

type RequestHandlerCreator = typeof CreateRequestHandler

/**
 * Creates the full request handler map for the Status resource. Maps handler names
 * (matching route definitions) to Express middleware via `createRequestHandler`.
 *
 * `requireAdmin` is the status-management authorizer middleware referenced by the
 * mutating routes (`createService`/`updateService`/`deleteService`/`createIncident`/
 * `updateIncident`). It must live here as a real handler-map key so the mlcl
 * injector's route scanner preserves it — a bare middleware string that isn't a
 * handler-map key is silently dropped (which is why the previous `'auth'` gate was
 * inert and the mutating routes shipped public). It is already an Express
 * middleware, so it is NOT wrapped in `createRequestHandler`.
 *
 * @param createRequestHandler - Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.
 * @returns A record mapping handler names to Express middleware functions.
 */
export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): Record<string, MoleculeRequestHandler> => ({
  requireAdmin: requireAdmin(),
  getStatus: createRequestHandler(handlers.getStatus(resource)),
  listServices: createRequestHandler(handlers.listServices(resource)),
  getService: createRequestHandler(handlers.getService(resource)),
  createService: createRequestHandler(handlers.createService(resource)),
  updateService: createRequestHandler(handlers.updateService(resource)),
  deleteService: createRequestHandler(handlers.deleteService(resource)),
  listIncidents: createRequestHandler(handlers.listIncidents(resource)),
  createIncident: createRequestHandler(handlers.createIncident(resource)),
  updateIncident: createRequestHandler(handlers.updateIncident(resource)),
  getUptime: createRequestHandler(handlers.getUptime(resource)),
})
