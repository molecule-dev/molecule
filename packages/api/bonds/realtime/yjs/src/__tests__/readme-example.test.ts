/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real realtime core and
 * real Yjs documents. The transport is the example's own in-memory outbox, so
 * nothing is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'

import { broadcast, createRoom, joinRoom, setProvider } from '@molecule/api-realtime'

import type { YjsOutboundMessage } from '../index.js'
import { createProvider, YJS_UPDATE_EVENT } from '../index.js'

describe('README @example', () => {
  it('merges an inbound CRDT update, relays it to peers, and broadcasts server edits', async () => {
    const outbox: YjsOutboundMessage[] = []
    const yjs = createProvider({ transport: { send: (message) => void outbox.push(message) } })
    setProvider(yjs)

    const room = await createRoom('whiteboard-1', { persistent: true })
    await joinRoom(room.id, 'alice')
    await joinRoom(room.id, 'bob')
    outbox.length = 0 // drop the join snapshots

    const aliceDoc = new Y.Doc()
    aliceDoc.getMap('shapes').set('shape-1', { type: 'rect', x: 10, y: 20 })
    yjs.applyInbound({
      roomId: room.id,
      clientId: 'alice',
      event: YJS_UPDATE_EVENT,
      data: Y.encodeStateAsUpdate(aliceDoc),
    })
    const shape = yjs.getDoc(room.id)?.getMap('shapes').get('shape-1')

    expect(shape).toEqual({ type: 'rect', x: 10, y: 20 })
    expect(outbox.map((message) => message.clientId)).toEqual(['bob'])

    // Bob's client applies what the transport delivered and converges.
    const bobDoc = new Y.Doc()
    const relayed = outbox[0]?.data
    if (!(relayed instanceof Uint8Array)) throw new Error('expected a binary update')
    Y.applyUpdate(bobDoc, relayed)
    expect(bobDoc.getMap('shapes').get('shape-1')).toEqual({ type: 'rect', x: 10, y: 20 })

    outbox.length = 0
    const serverEdit = new Y.Doc()
    serverEdit.getMap('shapes').set('shape-2', { type: 'circle', x: 50, y: 50 })
    await broadcast(room.id, YJS_UPDATE_EVENT, Y.encodeStateAsUpdate(serverEdit))

    expect(outbox.map((message) => message.clientId)).toEqual(['alice', 'bob'])
    expect(yjs.getDoc(room.id)?.getMap('shapes').get('shape-2')).toEqual({
      type: 'circle',
      x: 50,
      y: 50,
    })
  })
})
