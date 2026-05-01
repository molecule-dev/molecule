import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import * as Y from 'yjs'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
} from '@molecule/api-realtime'

import {
  YJS_AWARENESS_EVENT,
  YJS_UPDATE_EVENT,
  createProvider,
  type YjsProviderExtras,
} from '../provider.js'
import type { YjsOutboundMessage } from '../types.js'

type Provider = ReturnType<typeof createProvider>

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeIncrementingId(prefix: string): () => string {
  let n = 0
  return () => {
    n += 1
    return `${prefix}_${String(n)}`
  }
}

function collectingTransport(): {
  sent: YjsOutboundMessage[]
  send: (m: YjsOutboundMessage) => void
} {
  const sent: YjsOutboundMessage[] = []
  return {
    sent,
    send(m) {
      sent.push(m)
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-realtime-yjs', () => {
  let provider: Provider
  let transport: ReturnType<typeof collectingTransport>

  beforeEach(() => {
    transport = collectingTransport()
    provider = createProvider({
      transport,
      generateClientId: makeIncrementingId('client'),
      generateRoomId: makeIncrementingId('room'),
    })
  })

  afterEach(async () => {
    await provider.close()
  })

  describe('createRoom', () => {
    it('creates a room with an incrementing id and an attached Y.Doc', async () => {
      const room = await provider.createRoom('whiteboard')
      expect(room.id).toBe('room_1')
      expect(room.name).toBe('whiteboard')
      expect(room.clients).toEqual([])
      expect(provider.getDoc(room.id)).toBeInstanceOf(Y.Doc)
      expect(provider.getAwareness(room.id)).toBeInstanceOf(Awareness)
    })

    it('attaches metadata when provided', async () => {
      const room = await provider.createRoom('mind-map', { metadata: { topic: 'tests' } })
      expect(room.metadata).toEqual({ topic: 'tests' })
    })
  })

  describe('joinRoom', () => {
    it('adds the client and emits a Y.Doc snapshot to the joining client', async () => {
      const room = await provider.createRoom('doc-collab')
      // Pre-populate so the snapshot is non-trivial.
      const doc = provider.getDoc(room.id)!
      doc.getText('content').insert(0, 'hello')

      transport.sent.length = 0
      await provider.joinRoom(room.id, 'alice')

      expect(transport.sent).toHaveLength(1)
      expect(transport.sent[0]).toMatchObject({
        roomId: room.id,
        clientId: 'alice',
        event: YJS_UPDATE_EVENT,
      })
      expect(transport.sent[0].data).toBeInstanceOf(Uint8Array)

      // Snapshot decodes and reproduces the original text.
      const replay = new Y.Doc()
      Y.applyUpdate(replay, transport.sent[0].data as Uint8Array)
      expect(replay.getText('content').toString()).toBe('hello')

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
      expect(presence[0].clientId).toBe('alice')
      expect(presence[0].joinedAt).toBeInstanceOf(Date)
    })

    it('also sends an awareness snapshot if peers already have awareness state', async () => {
      const room = await provider.createRoom('cursor-room', { persistent: true })
      const aw = provider.getAwareness(room.id)!
      // Simulate a peer's awareness from a SEPARATE Y.Doc (so it has a
      // distinct clientID from the bond's own awareness).
      const peerDoc = new Y.Doc()
      const peerAwareness = new Awareness(peerDoc)
      peerAwareness.setLocalState({ user: 'bob', cursor: { x: 1, y: 2 } })
      const peerUpdate = encodeAwarenessUpdate(peerAwareness, [peerAwareness.clientID])
      // Apply it to the room awareness so getStates() is populated with a
      // genuine remote peer.
      const { applyAwarenessUpdate } = await import('y-protocols/awareness')
      applyAwarenessUpdate(aw, peerUpdate, 'origin')

      transport.sent.length = 0
      await provider.joinRoom(room.id, 'alice')

      const events = transport.sent.map((m) => m.event)
      expect(events).toContain(YJS_UPDATE_EVENT)
      expect(events).toContain(YJS_AWARENESS_EVENT)
    })

    it('throws when the room does not exist', async () => {
      await expect(provider.joinRoom('missing', 'alice')).rejects.toThrow(
        'Room "missing" does not exist',
      )
    })

    it('throws when the room is full', async () => {
      const room = await provider.createRoom('tiny', { maxClients: 1 })
      await provider.joinRoom(room.id, 'alice')
      await expect(provider.joinRoom(room.id, 'bob')).rejects.toThrow('is full')
    })

    it('is idempotent when the same client rejoins', async () => {
      const room = await provider.createRoom('rejoin')
      await provider.joinRoom(room.id, 'alice')
      await provider.joinRoom(room.id, 'alice')
      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
    })

    it('fires a connection handler the first time a client appears', async () => {
      const onConn = vi.fn<ConnectionHandler>()
      provider.onConnection(onConn)
      const room = await provider.createRoom('conn')
      await provider.joinRoom(room.id, 'alice')
      await provider.joinRoom(room.id, 'alice')
      expect(onConn).toHaveBeenCalledTimes(1)
      expect(onConn).toHaveBeenCalledWith('alice')
    })
  })

  describe('leaveRoom', () => {
    it('removes the client and clears their presence', async () => {
      const room = await provider.createRoom('leave', { persistent: true })
      await provider.joinRoom(room.id, 'alice')
      await provider.leaveRoom(room.id, 'alice')
      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)
    })

    it('removes a non-persistent room when the last client leaves', async () => {
      const room = await provider.createRoom('ephemeral')
      await provider.joinRoom(room.id, 'alice')
      await provider.leaveRoom(room.id, 'alice')
      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeUndefined()
    })

    it('keeps a persistent room when empty', async () => {
      const room = await provider.createRoom('keep', { persistent: true })
      await provider.joinRoom(room.id, 'alice')
      await provider.leaveRoom(room.id, 'alice')
      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeDefined()
    })

    it('throws when the room does not exist', async () => {
      await expect(provider.leaveRoom('missing', 'alice')).rejects.toThrow(
        'Room "missing" does not exist',
      )
    })

    it('is a no-op when the client is not in the room', async () => {
      const room = await provider.createRoom('noop', { persistent: true })
      await expect(provider.leaveRoom(room.id, 'alice')).resolves.toBeUndefined()
    })
  })

  describe('broadcast', () => {
    it('applies a Yjs update to the room Y.Doc and fans it out to all members', async () => {
      const room = await provider.createRoom('apply')
      await provider.joinRoom(room.id, 'alice')
      await provider.joinRoom(room.id, 'bob')
      transport.sent.length = 0

      // Build a Yjs update from a separate doc.
      const source = new Y.Doc()
      source.getText('t').insert(0, 'crdt')
      const update = Y.encodeStateAsUpdate(source)

      await provider.broadcast(room.id, YJS_UPDATE_EVENT, update)

      // Update was applied to the room doc.
      expect(provider.getDoc(room.id)!.getText('t').toString()).toBe('crdt')

      // And delivered to both clients.
      const recipients = transport.sent
        .filter((m) => m.event === YJS_UPDATE_EVENT)
        .map((m) => m.clientId)
      expect(recipients.sort()).toEqual(['alice', 'bob'])
    })

    it('relays application-level events without mutating the Y.Doc', async () => {
      const room = await provider.createRoom('relay')
      await provider.joinRoom(room.id, 'alice')
      transport.sent.length = 0

      await provider.broadcast(room.id, 'cursor:ping', { x: 5, y: 6 })

      expect(transport.sent).toHaveLength(1)
      expect(transport.sent[0]).toMatchObject({
        roomId: room.id,
        clientId: 'alice',
        event: 'cursor:ping',
        data: { x: 5, y: 6 },
      })
      // Y.Doc unchanged
      expect(provider.getDoc(room.id)!.getText('t').toString()).toBe('')
    })

    it('throws when the room does not exist', async () => {
      await expect(provider.broadcast('missing', 'ev', {})).rejects.toThrow(
        'Room "missing" does not exist',
      )
    })

    it('rejects yjs:update payloads that are not Uint8Array', async () => {
      const room = await provider.createRoom('bad-payload')
      await provider.joinRoom(room.id, 'alice')
      await expect(provider.broadcast(room.id, YJS_UPDATE_EVENT, 'oops')).rejects.toThrow(
        'requires Uint8Array data',
      )
    })
  })

  describe('sendTo', () => {
    it('delivers directly to the targeted client', async () => {
      const room = await provider.createRoom('direct')
      await provider.joinRoom(room.id, 'alice')
      transport.sent.length = 0

      await provider.sendTo('alice', 'private', { secret: 42 })
      expect(transport.sent).toHaveLength(1)
      expect(transport.sent[0]).toMatchObject({
        clientId: 'alice',
        event: 'private',
        data: { secret: 42 },
      })
    })

    it('throws when the client is not connected', async () => {
      await expect(provider.sendTo('ghost', 'ev', {})).rejects.toThrow(
        'Client "ghost" is not connected',
      )
    })
  })

  describe('applyInbound (transport hook)', () => {
    it('applies inbound CRDT updates to the room Y.Doc and re-broadcasts to others', async () => {
      const room = await provider.createRoom('inbound')
      await provider.joinRoom(room.id, 'alice')
      await provider.joinRoom(room.id, 'bob')
      transport.sent.length = 0

      const source = new Y.Doc()
      source.getMap('m').set('k', 'v')
      const update = Y.encodeStateAsUpdate(source)

      provider.applyInbound({
        roomId: room.id,
        clientId: 'alice',
        event: YJS_UPDATE_EVENT,
        data: update,
      })

      expect(provider.getDoc(room.id)!.getMap('m').get('k')).toBe('v')

      // Only bob should receive the relay (alice originated it).
      const recipients = transport.sent
        .filter((m) => m.event === YJS_UPDATE_EVENT)
        .map((m) => m.clientId)
      expect(recipients).toEqual(['bob'])
    })

    it('dispatches application-level inbound events to onMessage handlers', async () => {
      const onMessage = vi.fn<MessageHandler>()
      provider.onMessage(onMessage)
      const room = await provider.createRoom('app-msg')
      await provider.joinRoom(room.id, 'alice')

      provider.applyInbound({
        roomId: room.id,
        clientId: 'alice',
        event: 'chat',
        data: { text: 'hi' },
      })

      expect(onMessage).toHaveBeenCalledWith(room.id, 'alice', 'chat', { text: 'hi' })
    })

    it('silently ignores inbound messages for unknown rooms', () => {
      expect(() =>
        provider.applyInbound({
          roomId: 'nope',
          clientId: 'a',
          event: YJS_UPDATE_EVENT,
          data: new Uint8Array([0]),
        }),
      ).not.toThrow()
    })

    it('rejects yjs:update inbound with non-Uint8Array data', async () => {
      const room = await provider.createRoom('bad-inbound')
      await provider.joinRoom(room.id, 'alice')
      expect(() =>
        provider.applyInbound({
          roomId: room.id,
          clientId: 'alice',
          event: YJS_UPDATE_EVENT,
          data: 'not bytes',
        }),
      ).toThrow('requires Uint8Array data')
    })
  })

  describe('awareness', () => {
    it('routes awareness updates through the room Awareness instance', async () => {
      const room = await provider.createRoom('aw')
      await provider.joinRoom(room.id, 'alice')
      await provider.joinRoom(room.id, 'bob')
      transport.sent.length = 0

      // Build an awareness update.
      const peerDoc = new Y.Doc()
      const peerAw = new Awareness(peerDoc)
      peerAw.setLocalState({ user: 'alice', cursor: { x: 1, y: 2 } })
      const update = encodeAwarenessUpdate(peerAw, [peerAw.clientID])

      provider.applyInbound({
        roomId: room.id,
        clientId: 'alice',
        event: YJS_AWARENESS_EVENT,
        data: update,
      })

      const states = provider.getAwareness(room.id)!.getStates()
      expect(states.get(peerAw.clientID)).toEqual({ user: 'alice', cursor: { x: 1, y: 2 } })

      // bob should be the only relay recipient.
      const recipients = transport.sent
        .filter((m) => m.event === YJS_AWARENESS_EVENT)
        .map((m) => m.clientId)
      expect(recipients).toEqual(['bob'])
    })
  })

  describe('two-client convergence', () => {
    it('two providers wired through a shared transport reach the same Y.Doc state', async () => {
      // Setup: provider A and provider B, each modeling one server endpoint.
      // A shared "wire" routes outbound messages from one provider into
      // applyInbound on the other — this simulates a websocket relay.
      const transportA: { send: (m: YjsOutboundMessage) => void } = { send: () => {} }
      const transportB: { send: (m: YjsOutboundMessage) => void } = { send: () => {} }

      const providerA = createProvider({
        transport: transportA,
        generateRoomId: () => 'shared',
      })
      const providerB = createProvider({
        transport: transportB,
        generateRoomId: () => 'shared',
      })

      // Wire: anything provider A wants to send to "remote" is fed into B,
      // and vice-versa. We use clientId 'remote' as the bridge identity.
      transportA.send = (m) => {
        // Only relay yjs events to the remote provider; skip self-deliveries.
        if (
          m.clientId === 'remote' &&
          (m.event === YJS_UPDATE_EVENT || m.event === YJS_AWARENESS_EVENT)
        ) {
          providerB.applyInbound({
            roomId: 'shared',
            clientId: 'remote',
            event: m.event,
            data: m.data,
          })
        }
      }
      transportB.send = (m) => {
        if (
          m.clientId === 'remote' &&
          (m.event === YJS_UPDATE_EVENT || m.event === YJS_AWARENESS_EVENT)
        ) {
          providerA.applyInbound({
            roomId: 'shared',
            clientId: 'remote',
            event: m.event,
            data: m.data,
          })
        }
      }

      await providerA.createRoom('shared', { persistent: true })
      await providerB.createRoom('shared', { persistent: true })
      await providerA.joinRoom('shared', 'alice')
      await providerA.joinRoom('shared', 'remote')
      await providerB.joinRoom('shared', 'bob')
      await providerB.joinRoom('shared', 'remote')

      const docA = providerA.getDoc('shared')!
      const docB = providerB.getDoc('shared')!

      // Mutate on A.
      docA.getMap('shapes').set('s1', { type: 'rect', x: 10 })
      const updateFromA = Y.encodeStateAsUpdate(docA)
      providerA.applyInbound({
        roomId: 'shared',
        clientId: 'remote',
        event: YJS_UPDATE_EVENT,
        data: updateFromA,
      })

      // Mutate on B (concurrent).
      docB.getMap('shapes').set('s2', { type: 'circle', r: 5 })
      const updateFromB = Y.encodeStateAsUpdate(docB)
      providerB.applyInbound({
        roomId: 'shared',
        clientId: 'remote',
        event: YJS_UPDATE_EVENT,
        data: updateFromB,
      })

      // Cross-sync: feed A's full state into B and vice versa to converge.
      providerB.applyInbound({
        roomId: 'shared',
        clientId: 'remote',
        event: YJS_UPDATE_EVENT,
        data: Y.encodeStateAsUpdate(docA),
      })
      providerA.applyInbound({
        roomId: 'shared',
        clientId: 'remote',
        event: YJS_UPDATE_EVENT,
        data: Y.encodeStateAsUpdate(docB),
      })

      // Both docs converge to identical state.
      expect(docA.getMap('shapes').get('s1')).toEqual({ type: 'rect', x: 10 })
      expect(docA.getMap('shapes').get('s2')).toEqual({ type: 'circle', r: 5 })
      expect(docB.getMap('shapes').get('s1')).toEqual({ type: 'rect', x: 10 })
      expect(docB.getMap('shapes').get('s2')).toEqual({ type: 'circle', r: 5 })

      await providerA.close()
      await providerB.close()
    })
  })

  describe('getRooms', () => {
    it('lists every active room', async () => {
      await provider.createRoom('a')
      await provider.createRoom('b')
      const all = await provider.getRooms()
      expect(all.map((r) => r.name).sort()).toEqual(['a', 'b'])
    })

    it('returns an empty array initially', async () => {
      const all = await provider.getRooms()
      expect(all).toEqual([])
    })
  })

  describe('close', () => {
    it('clears rooms, fires disconnection handlers, and tears down docs', async () => {
      const onDisc = vi.fn<DisconnectionHandler>()
      provider.onDisconnection(onDisc)
      const room = await provider.createRoom('shut')
      await provider.joinRoom(room.id, 'alice')

      await provider.close()

      const allRooms = await provider.getRooms()
      expect(allRooms).toEqual([])
      expect(onDisc).toHaveBeenCalledWith('alice', 'close')
    })
  })

  describe('pending() (no transport)', () => {
    it('queues outbound messages when no transport is configured', async () => {
      const noTransport = createProvider({
        generateRoomId: makeIncrementingId('rt'),
      })
      try {
        const room = await noTransport.createRoom('q')
        await noTransport.joinRoom(room.id, 'alice')
        await noTransport.broadcast(room.id, 'cursor:tick', { t: 1 })

        const drained = noTransport.pending()
        // join sends a snapshot, broadcast sends one event = at least 2 entries.
        expect(drained.length).toBeGreaterThanOrEqual(2)
        expect(drained.some((m) => m.event === 'cursor:tick')).toBe(true)
        // Draining empties the queue.
        expect(noTransport.pending()).toEqual([])
      } finally {
        await noTransport.close()
      }
    })
  })

  describe('YjsProviderExtras shape', () => {
    it('exposes applyInbound, getDoc, getAwareness, pending', () => {
      const extras: YjsProviderExtras = provider
      expect(typeof extras.applyInbound).toBe('function')
      expect(typeof extras.getDoc).toBe('function')
      expect(typeof extras.getAwareness).toBe('function')
      expect(typeof extras.pending).toBe('function')
    })
  })
})
