/**
 * Realtime-rooms utility for molecule.dev.
 *
 * Authenticated, capacity-bounded, role-aware named pub/sub rooms built
 * on top of `@molecule/api-realtime`'s transport bond and persisted via
 * `@molecule/api-database`'s abstract DataStore.
 *
 * Solves the IDOR pattern flagged in flagship realtime apps
 * (quiz-platform live sessions, virtual-classroom rooms) where any
 * authenticated user could subscribe to / broadcast on any channel —
 * {@link assertCanAct} is the central guard.
 *
 * @example
 * ```typescript
 * import {
 *   createRoom,
 *   joinRoom,
 *   broadcast,
 *   subscribe,
 *   assertCanAct,
 * } from '@molecule/api-realtime-rooms'
 *
 * // Host creates a private room with a join code.
 * const room = await createRoom({
 *   kind: 'quiz-session',
 *   ownerId: hostUserId,
 *   capacity: 30,
 *   joinCode: 'ABC123',
 * })
 *
 * // Guest joins.
 * await joinRoom(room.id, guestUserId, 'ABC123')
 *
 * // Broadcast a question — handler must authorise first.
 * await assertCanAct(room.id, hostUserId, 'host')
 * await broadcast(room.id, { kind: 'question-asked', payload: { qid: 1 } })
 * ```
 *
 * @module
 */

export * from './errors.js'
export * from './service.js'
export * from './types.js'
