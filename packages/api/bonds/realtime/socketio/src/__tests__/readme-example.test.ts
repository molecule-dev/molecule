/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — this bond attached to a real HTTP
 * server through the realtime core, driven by real `socket.io-client`
 * connections speaking the join protocol (no mocks).
 *
 * @module
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getLogger } from '@molecule/api-bond'
import { broadcast, close, onJoinRequest, onMessage, setProvider } from '@molecule/api-realtime'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const logger = getLogger()
  const server = http.createServer()
  let port = 0
  const clients: ClientSocket[] = []

  beforeAll(async () => {
    const realtime = createProvider({
      deferAttach: true,
      serverOptions: { cors: { origin: process.env.APP_ORIGIN, credentials: true } },
    })
    setProvider(realtime)
    realtime.attachHttpServer?.(server)

    const sessionUserByToken = new Map([['token-ada', 'user-ada']])
    const channelMembers = new Map([['channel:general', new Set(['user-ada'])]])
    onJoinRequest(({ room, auth }) => {
      const userId = sessionUserByToken.get(String(auth.token))
      return userId !== undefined && (channelMembers.get(room)?.has(userId) ?? false)
    })

    onMessage((roomId, clientId, event, data) => {
      if (event !== 'chat') return
      broadcast(roomId, 'chat', { from: clientId, text: data }).catch((error: unknown) => {
        logger.error('realtime chat broadcast failed', { roomId, error })
      })
    })

    await new Promise<void>((resolve) => server.listen(0, resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    for (const client of clients) client.disconnect()
    await close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const connect = async (auth: Record<string, unknown>): Promise<ClientSocket> => {
    const socket = connectClient(`http://127.0.0.1:${port}`, { transports: ['websocket'], auth })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve())
      socket.once('connect_error', reject)
    })
    return socket
  }

  const next = <T>(socket: ClientSocket, event: string): Promise<T> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), 5000)
      socket.once(event, (payload: T) => {
        clearTimeout(timer)
        resolve(payload)
      })
    })

  it('denies an unauthorized join, admits a member, and fans a room-send out to the room', async () => {
    const stranger = await connect({ token: 'nope' })
    const strangerChats: unknown[] = []
    stranger.on('chat', (payload: unknown) => strangerChats.push(payload))
    const denied = next<{ room: string }>(stranger, 'molecule:join-denied')
    stranger.emit('molecule:join', { room: 'channel:general' })
    expect((await denied).room).toBe('channel:general')

    const ada = await connect({ token: 'token-ada' })
    const joined = next<{ room: string }>(ada, 'molecule:joined')
    ada.emit('molecule:join', { room: 'channel:general' })
    expect(await joined).toEqual({ room: 'channel:general' })

    const chat = next<{ from: string; text: unknown }>(ada, 'chat')
    ada.emit('molecule:room-send', { room: 'channel:general', event: 'chat', data: 'hello' })
    expect(await chat).toEqual({ from: ada.id, text: 'hello' })
    expect(strangerChats).toEqual([])
  })
})
