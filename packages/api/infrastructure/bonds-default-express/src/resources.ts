/**
 * Pre-wired default request handler maps for the user + device
 * resources. Apps that don't need to customize their resource
 * wiring can re-export these directly from
 * `App/Resource/<Name>/index.ts`, eliminating the byte-identical
 * `createRequestHandlerMap(createRequestHandler)` calls that every
 * flagship app shipped.
 *
 * @module
 */

import { createRequestHandler } from '@molecule/api-resource'
import {
  createRequestHandlerMap as createDeviceRequestHandlerMap,
  deviceService,
} from '@molecule/api-resource-device'
import {
  authorization,
  createRequestHandlerMap as createUserRequestHandlerMap,
} from '@molecule/api-resource-user'

/** Pre-wired request handler map for `@molecule/api-resource-user`. */
export const userRequestHandlerMap = createUserRequestHandlerMap(createRequestHandler)

/** Pre-wired request handler map for `@molecule/api-resource-device`. */
export const deviceRequestHandlerMap = createDeviceRequestHandlerMap(createRequestHandler)

export { authorization as userAuthorization, deviceService }
