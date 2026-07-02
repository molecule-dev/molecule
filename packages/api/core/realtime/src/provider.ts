/**
 * Realtime provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-realtime-socketio`) call `setProvider()`
 * during setup. Application code uses the convenience functions from `realtime.ts`.
 *
 * @module
 */

import { bond, expectBond, getLogger, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  JoinGuard,
  MessageHandler,
  RealtimeProvider,
} from './types.js'

const BOND_TYPE = 'realtime'
expectBond(BOND_TYPE)

const logger = getLogger()

// Handler registrations made BEFORE a provider is bonded are buffered here and
// flushed by setProvider(). The socketio bond can only bond its provider at
// SERVER-CREATION (it must bind to the http.Server), which runs AFTER
// `postBondsSetup` — the natural place app code registers presence/connection
// handlers. Without buffering, `onConnection()` in postBondsSetup throws
// "Realtime provider not configured" and crashes the API at boot (observed on a
// custom realtime build). Buffering makes registration order-independent.
const pendingConnection: ConnectionHandler[] = []
const pendingDisconnection: DisconnectionHandler[] = []
const pendingMessage: MessageHandler[] = []
const pendingJoinGuards: JoinGuard[] = []

/**
 * Hand a join guard to the provider, warning (never silently dropping) when
 * the provider's transport does not implement the client-initiated join
 * protocol — a guard the app registered but that cannot be enforced is a
 * security-relevant configuration mismatch worth surfacing.
 *
 * @param provider - The bonded realtime provider.
 * @param guard - The join guard to register.
 */
const applyJoinGuard = (provider: RealtimeProvider, guard: JoinGuard): void => {
  if (provider.onJoinRequest) {
    provider.onJoinRequest(guard)
  } else {
    logger.warn(
      'Realtime provider does not implement onJoinRequest — a registered join guard cannot be enforced. ' +
        'If the transport supports client-initiated room joins they will be default-allowed.',
    )
  }
}

/**
 * Registers a realtime provider as the active singleton. Called by bond
 * packages during application startup. Flushes any connection/disconnection/
 * message handlers that were registered before the provider was bonded.
 *
 * @param provider - The realtime provider implementation to bond.
 */
export const setProvider = (provider: RealtimeProvider): void => {
  bond(BOND_TYPE, provider)
  while (pendingConnection.length)
    provider.onConnection(pendingConnection.shift() as ConnectionHandler)
  while (pendingDisconnection.length)
    provider.onDisconnection(pendingDisconnection.shift() as DisconnectionHandler)
  while (pendingMessage.length) provider.onMessage(pendingMessage.shift() as MessageHandler)
  while (pendingJoinGuards.length) applyJoinGuard(provider, pendingJoinGuards.shift() as JoinGuard)
}

/**
 * Register a connection handler now if a provider is bonded, else buffer it for
 * flush on the next setProvider(). Order-independent (see the buffer comment).
 *
 * @param handler - The connection handler to register or buffer.
 */
export const registerConnection = (handler: ConnectionHandler): void => {
  if (isBonded(BOND_TYPE)) getProvider().onConnection(handler)
  else pendingConnection.push(handler)
}

/**
 * Register a disconnection handler now if bonded, else buffer it.
 *
 * @param handler - The disconnection handler to register or buffer.
 */
export const registerDisconnection = (handler: DisconnectionHandler): void => {
  if (isBonded(BOND_TYPE)) getProvider().onDisconnection(handler)
  else pendingDisconnection.push(handler)
}

/**
 * Register a message handler now if bonded, else buffer it.
 *
 * @param handler - The message handler to register or buffer.
 */
export const registerMessage = (handler: MessageHandler): void => {
  if (isBonded(BOND_TYPE)) getProvider().onMessage(handler)
  else pendingMessage.push(handler)
}

/**
 * Register a join guard now if bonded, else buffer it for flush on the next
 * setProvider(). Order-independent (see the buffer comment), so apps can
 * register room authorization in postBondsSetup before the realtime bond
 * binds at server-creation.
 *
 * @param guard - The join guard to register or buffer.
 */
export const registerJoinGuard = (guard: JoinGuard): void => {
  if (isBonded(BOND_TYPE)) applyJoinGuard(getProvider(), guard)
  else pendingJoinGuards.push(guard)
}

/**
 * Retrieves the bonded realtime provider, throwing if none is configured.
 *
 * @returns The bonded realtime provider.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const getProvider = (): RealtimeProvider => {
  try {
    return bondRequire<RealtimeProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('realtime.error.noProvider', undefined, {
        defaultValue: 'Realtime provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a realtime provider is currently bonded.
 *
 * @returns `true` if a realtime provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
