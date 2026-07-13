/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual `yjs` +
 * `y-protocols` acting as REAL client replicas on the other side of the
 * transport.
 *
 * `provider.test.ts` already runs against real yjs, but it only ever
 * inspected the bond's own state — it never applied the bond's relayed
 * frames to a peer replica the way a real collaborator does. That gap hid a
 * y-protocols API misuse in `leaveRoom()`: `setLocalState(null)` removed the
 * SERVER's own awareness entry (not the departing peer's) and the broadcast
 * re-encoded the peer's still-present state — a no-op on every receiver, so
 * peers kept seeing ghost collaborators until the 30s awareness timeout.
 * This file pins the fixed behavior from the CONSUMER's (peer replica's)
 * point of view.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import * as Y from 'yjs'

import {
  clientIdToAwarenessId,
  createProvider,
  YJS_AWARENESS_EVENT,
  YJS_UPDATE_EVENT,
} from '../provider.js'
import type { YjsOutboundMessage } from '../types.js'

describe('@molecule/api-realtime-yjs × REAL yjs/y-protocols peer replicas', () => {
  it('leaveRoom removes the departing client’s awareness for REAL peer replicas (no ghost collaborators)', async () => {
    const sent: YjsOutboundMessage[] = []
    const provider = createProvider({ transport: { send: (m) => sent.push(m) } })
    const room = await provider.createRoom('board', { persistent: true })
    await provider.joinRoom(room.id, 'alice')
    await provider.joinRoom(room.id, 'bob')

    // alice is a REAL collaborating client whose awareness id is aligned via
    // the exported mapping (see clientIdToAwarenessId docs).
    const aliceDoc = new Y.Doc()
    aliceDoc.clientID = clientIdToAwarenessId('alice')
    const aliceAwareness = new Awareness(aliceDoc)
    aliceAwareness.setLocalState({ user: 'alice', cursor: { x: 3, y: 7 } })
    provider.applyInbound({
      roomId: room.id,
      clientId: 'alice',
      event: YJS_AWARENESS_EVENT,
      data: encodeAwarenessUpdate(aliceAwareness, [aliceDoc.clientID]),
    })

    // bob is a REAL peer replica: it applies every awareness frame the bond
    // relays to it, exactly like a browser collaborator would.
    const bobAwareness = new Awareness(new Y.Doc())
    const applyRelayedAwarenessTo = (target: Awareness, forClient: string): void => {
      for (const m of sent) {
        if (m.event === YJS_AWARENESS_EVENT && m.clientId === forClient) {
          applyAwarenessUpdate(target, m.data as Uint8Array, 'wire')
        }
      }
    }
    applyRelayedAwarenessTo(bobAwareness, 'bob')
    expect(bobAwareness.getStates().get(clientIdToAwarenessId('alice'))).toEqual({
      user: 'alice',
      cursor: { x: 3, y: 7 },
    })

    // getPresence correlates the awareness state to the molecule client.
    const presence = await provider.getPresence(room.id)
    const alicePresence = presence.find((p) => p.clientId === 'alice')
    expect(alicePresence?.metadata?.awareness).toEqual({ user: 'alice', cursor: { x: 3, y: 7 } })

    const serverAwareness = provider.getAwareness(room.id)!
    const serverOwnId = serverAwareness.clientID

    sent.length = 0
    await provider.leaveRoom(room.id, 'alice')

    // Server side: alice's entry is gone; the server's OWN local entry
    // survives (the old code nuked the wrong one).
    expect(serverAwareness.getStates().has(clientIdToAwarenessId('alice'))).toBe(false)
    expect(serverAwareness.getStates().has(serverOwnId)).toBe(true)

    // Peer side: the relayed removal frame actually removes alice on bob's
    // REAL replica — before the fix this was a no-op and bob kept a ghost.
    applyRelayedAwarenessTo(bobAwareness, 'bob')
    expect(bobAwareness.getStates().has(clientIdToAwarenessId('alice'))).toBe(false)

    await provider.close()
  })

  it('CONSUMER PROPERTY: a late joiner’s REAL Y.Doc converges from the join snapshot (slow collaborator arrives after edits)', async () => {
    const sent: YjsOutboundMessage[] = []
    const provider = createProvider({ transport: { send: (m) => sent.push(m) } })
    const room = await provider.createRoom('doc', { persistent: true })
    await provider.joinRoom(room.id, 'alice')

    // Realistic flow: alice edits for a while BEFORE bob ever shows up.
    const aliceDoc = new Y.Doc()
    aliceDoc.getText('body').insert(0, 'hello')
    provider.applyInbound({
      roomId: room.id,
      clientId: 'alice',
      event: YJS_UPDATE_EVENT,
      data: Y.encodeStateAsUpdate(aliceDoc),
    })
    aliceDoc.getText('body').insert(5, ' world')
    provider.applyInbound({
      roomId: room.id,
      clientId: 'alice',
      event: YJS_UPDATE_EVENT,
      data: Y.encodeStateAsUpdate(aliceDoc),
    })

    sent.length = 0
    await provider.joinRoom(room.id, 'bob')

    // The bond must hand bob a snapshot that brings a FRESH real Y.Doc to
    // full convergence — not just "some update".
    const bobDoc = new Y.Doc()
    for (const m of sent) {
      if (m.event === YJS_UPDATE_EVENT && m.clientId === 'bob') {
        Y.applyUpdate(bobDoc, m.data as Uint8Array)
      }
    }
    expect(bobDoc.getText('body').toString()).toBe('hello world')

    await provider.close()
  })

  it('FAILURE DISAMBIGUATION: missing room, unknown client, and bad payload type fail with distinct, named errors', async () => {
    const provider = createProvider({ transport: { send: () => undefined } })
    const room = await provider.createRoom('r', { persistent: true })
    await provider.joinRoom(room.id, 'alice')

    // Three different wiring bugs must not collapse into one opaque failure.
    await expect(provider.broadcast('nowhere', YJS_UPDATE_EVENT, new Uint8Array())).rejects.toThrow(
      'Room "nowhere" does not exist',
    )
    await expect(provider.sendTo('ghost', 'ping', {})).rejects.toThrow(
      'Client "ghost" is not connected',
    )
    await expect(provider.broadcast(room.id, YJS_UPDATE_EVENT, 'not-binary')).rejects.toThrow(
      'Event "yjs:update" requires Uint8Array data',
    )

    await provider.close()
  })
})
