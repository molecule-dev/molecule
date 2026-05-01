/**
 * Realtime-rooms error types.
 *
 * Each error is a discriminated subclass of `Error` so apps can branch
 * on `instanceof` without parsing message strings. Messages are plain
 * English fallbacks intended to be overridden by the consumer's i18n
 * layer at the handler boundary.
 *
 * @module
 */

/**
 * Base class for all realtime-rooms errors.
 */
export class RoomError extends Error {
  /**
   * @param message - English fallback message.
   */
  constructor(message: string) {
    super(message)
    this.name = 'RoomError'
  }
}

/**
 * The requested room does not exist.
 */
export class RoomNotFoundError extends RoomError {
  /**
   * @param roomId - The room id that was not found.
   */
  constructor(public readonly roomId: string) {
    super(`Room not found: ${roomId}`)
    this.name = 'RoomNotFoundError'
  }
}

/**
 * Room is full — capacity has been reached.
 */
export class RoomCapacityExceededError extends RoomError {
  /**
   * @param roomId - The room that is full.
   * @param capacity - The configured capacity.
   */
  constructor(
    public readonly roomId: string,
    public readonly capacity: number,
  ) {
    super(`Room ${roomId} is at capacity (${capacity})`)
    this.name = 'RoomCapacityExceededError'
  }
}

/**
 * Supplied join code did not match the room's configured code.
 */
export class InvalidJoinCodeError extends RoomError {
  /**
   * @param roomId - The room that rejected the join.
   */
  constructor(public readonly roomId: string) {
    super(`Invalid join code for room ${roomId}`)
    this.name = 'InvalidJoinCodeError'
  }
}

/**
 * The acting user is not authorised to perform the requested action.
 *
 * Thrown by {@link assertCanAct} when the user is not a member of the
 * room or lacks the required role. This is the central guard that
 * fixes the IDOR pattern in flagship realtime apps.
 */
export class UnauthorizedRoomActionError extends RoomError {
  /**
   * @param roomId - The room the action was attempted on.
   * @param userId - The user id that attempted the action.
   * @param requiredRole - Optional minimum role that was required.
   */
  constructor(
    public readonly roomId: string,
    public readonly userId: string,
    public readonly requiredRole?: 'host' | 'guest',
  ) {
    super(
      requiredRole
        ? `User ${userId} is not authorised as ${requiredRole} on room ${roomId}`
        : `User ${userId} is not a member of room ${roomId}`,
    )
    this.name = 'UnauthorizedRoomActionError'
  }
}
