import { describe, expect, it } from 'vitest'

import {
  InvalidJoinCodeError,
  RoomCapacityExceededError,
  RoomError,
  RoomNotFoundError,
  UnauthorizedRoomActionError,
} from '../errors.js'

describe('RoomError (base class)', () => {
  it('is an Error subclass', () => {
    const err = new RoomError('something')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RoomError)
  })

  it('preserves the message', () => {
    expect(new RoomError('the message').message).toBe('the message')
  })

  it('sets name=RoomError', () => {
    expect(new RoomError('x').name).toBe('RoomError')
  })
})

describe('RoomNotFoundError', () => {
  it('extends RoomError', () => {
    const err = new RoomNotFoundError('room-1')
    expect(err).toBeInstanceOf(RoomError)
    expect(err).toBeInstanceOf(RoomNotFoundError)
  })

  it('puts the roomId in the message', () => {
    expect(new RoomNotFoundError('room-42').message).toBe('Room not found: room-42')
  })

  it('exposes roomId as a readonly property', () => {
    const err = new RoomNotFoundError('room-1')
    expect(err.roomId).toBe('room-1')
  })

  it('sets name=RoomNotFoundError (not inherited "RoomError")', () => {
    expect(new RoomNotFoundError('r').name).toBe('RoomNotFoundError')
  })
})

describe('RoomCapacityExceededError', () => {
  it('extends RoomError', () => {
    expect(new RoomCapacityExceededError('r', 10)).toBeInstanceOf(RoomError)
  })

  it('includes both roomId and capacity in the message', () => {
    const err = new RoomCapacityExceededError('chat-1', 25)
    expect(err.message).toContain('chat-1')
    expect(err.message).toContain('25')
  })

  it('exposes roomId + capacity', () => {
    const err = new RoomCapacityExceededError('r', 10)
    expect(err.roomId).toBe('r')
    expect(err.capacity).toBe(10)
  })

  it('sets name=RoomCapacityExceededError', () => {
    expect(new RoomCapacityExceededError('r', 1).name).toBe('RoomCapacityExceededError')
  })
})

describe('InvalidJoinCodeError', () => {
  it('extends RoomError', () => {
    expect(new InvalidJoinCodeError('r')).toBeInstanceOf(RoomError)
  })

  it('mentions the room id in the message but NOT the supplied code (security: never echo back attempted secrets)', () => {
    const err = new InvalidJoinCodeError('room-1')
    expect(err.message).toContain('room-1')
    expect(err.message).not.toMatch(/code:\s*\S/) // no code value leaked
  })

  it('sets name=InvalidJoinCodeError', () => {
    expect(new InvalidJoinCodeError('r').name).toBe('InvalidJoinCodeError')
  })
})

describe('UnauthorizedRoomActionError', () => {
  it('extends RoomError', () => {
    expect(new UnauthorizedRoomActionError('r', 'u')).toBeInstanceOf(RoomError)
  })

  it('with no requiredRole: "not a member" message shape', () => {
    const err = new UnauthorizedRoomActionError('room-1', 'user-2')
    expect(err.message).toMatch(/user-2.*not a member.*room-1/i)
  })

  it('with requiredRole: includes the role name in the message', () => {
    const err = new UnauthorizedRoomActionError('room-1', 'user-2', 'host')
    expect(err.message).toMatch(/host/)
    expect(err.message).toMatch(/user-2/)
    expect(err.message).toMatch(/room-1/)
  })

  it('exposes roomId, userId, requiredRole properties', () => {
    const err = new UnauthorizedRoomActionError('r', 'u', 'guest')
    expect(err.roomId).toBe('r')
    expect(err.userId).toBe('u')
    expect(err.requiredRole).toBe('guest')
  })

  it('requiredRole is undefined when omitted', () => {
    expect(new UnauthorizedRoomActionError('r', 'u').requiredRole).toBeUndefined()
  })

  it('sets name=UnauthorizedRoomActionError', () => {
    expect(new UnauthorizedRoomActionError('r', 'u').name).toBe('UnauthorizedRoomActionError')
  })
})

describe('error hierarchy — instanceof discriminators', () => {
  it('all subclasses are instanceof RoomError (catch-all pattern works)', () => {
    const errors: RoomError[] = [
      new RoomNotFoundError('r'),
      new RoomCapacityExceededError('r', 1),
      new InvalidJoinCodeError('r'),
      new UnauthorizedRoomActionError('r', 'u'),
    ]
    for (const e of errors) {
      expect(e).toBeInstanceOf(RoomError)
      expect(e).toBeInstanceOf(Error)
    }
  })

  it('siblings are NOT instanceof each other', () => {
    expect(new RoomNotFoundError('r')).not.toBeInstanceOf(InvalidJoinCodeError)
    expect(new InvalidJoinCodeError('r')).not.toBeInstanceOf(RoomNotFoundError)
    expect(new UnauthorizedRoomActionError('r', 'u')).not.toBeInstanceOf(RoomCapacityExceededError)
  })
})
