/**
 * Tests for `connectImap` + the `ImapClient` wrapper. The real `imapflow`
 * driver is replaced with a hand-rolled mock that satisfies
 * {@link import('../driverTypes.js').ImapFlowLike}.
 */

import { describe, expect, it, vi } from 'vitest'

import { connectImap } from '../client.js'
import type {
  ImapDownloadManyEntry,
  ImapFetchMessage,
  ImapFlowFactory,
  ImapFlowLike,
  ImapListResponse,
  ImapSearchQuery,
} from '../driverTypes.js'
import { ImapError } from '../types.js'

interface MockState {
  connectShouldFail?: Error & { authenticationFailed?: boolean }
  folders: ImapListResponse[]
  openShouldFail?: Error & { code?: string }
  searchUids: number[]
  searchCalls: ImapSearchQuery[]
  searchOptions: Array<{ uid?: boolean }>
  fetchAllMessages: ImapFetchMessage[]
  fetchAllCalls: Array<{ range: number[] | string; query: Record<string, unknown> }>
  fetchOneMessage?: ImapFetchMessage | false
  fetchOneCalls: Array<{ seq: string; query: Record<string, unknown> }>
  flagsAddCalls: Array<{ range: number[]; flags: string[] }>
  flagsRemoveCalls: Array<{ range: number[]; flags: string[] }>
  moveCalls: Array<{ range: number[]; destination: string }>
  deleteCalls: Array<{ range: number[] }>
  downloadResults: Record<string, ImapDownloadManyEntry>
  downloadCalls: Array<{ range: number; parts: string[] }>
  logoutCalls: number
  closeCalls: number
}

function createMockDriver(state: MockState): ImapFlowLike {
  return {
    async connect(): Promise<void> {
      if (state.connectShouldFail) throw state.connectShouldFail
    },
    async logout(): Promise<void> {
      state.logoutCalls += 1
    },
    close(): void {
      state.closeCalls += 1
    },
    async list(): Promise<ImapListResponse[]> {
      return state.folders
    },
    async mailboxOpen(): Promise<unknown> {
      if (state.openShouldFail) throw state.openShouldFail
      return {}
    },
    async search(query, options): Promise<number[] | false> {
      state.searchCalls.push(query)
      state.searchOptions.push(options ?? {})
      return state.searchUids
    },
    async fetchAll(range, query): Promise<ImapFetchMessage[]> {
      state.fetchAllCalls.push({
        range: range as number[] | string,
        query: query as Record<string, unknown>,
      })
      return state.fetchAllMessages
    },
    async fetchOne(seq, query): Promise<ImapFetchMessage | false> {
      state.fetchOneCalls.push({ seq, query: query as Record<string, unknown> })
      return state.fetchOneMessage ?? false
    },
    async messageFlagsAdd(range, flags): Promise<boolean> {
      state.flagsAddCalls.push({ range, flags })
      return true
    },
    async messageFlagsRemove(range, flags): Promise<boolean> {
      state.flagsRemoveCalls.push({ range, flags })
      return true
    },
    async messageMove(range, destination): Promise<unknown> {
      state.moveCalls.push({ range, destination })
      return { destination }
    },
    async messageDelete(range): Promise<boolean> {
      state.deleteCalls.push({ range })
      return true
    },
    async downloadMany(range, parts): Promise<Record<string, ImapDownloadManyEntry>> {
      state.downloadCalls.push({ range, parts })
      const out: Record<string, ImapDownloadManyEntry> = {}
      for (const part of parts) {
        out[part] = state.downloadResults[part] ?? { meta: {}, content: null }
      }
      return out
    },
  }
}

function createState(overrides: Partial<MockState> = {}): MockState {
  return {
    folders: [],
    searchUids: [],
    searchCalls: [],
    searchOptions: [],
    fetchAllMessages: [],
    fetchAllCalls: [],
    fetchOneCalls: [],
    flagsAddCalls: [],
    flagsRemoveCalls: [],
    moveCalls: [],
    deleteCalls: [],
    downloadResults: {},
    downloadCalls: [],
    logoutCalls: 0,
    closeCalls: 0,
    ...overrides,
  }
}

function makeFactory(state: MockState): {
  factory: ImapFlowFactory
  optionsSeen: Array<Parameters<ImapFlowFactory>[0]>
} {
  const optionsSeen: Array<Parameters<ImapFlowFactory>[0]> = []
  const factory: ImapFlowFactory = (options) => {
    optionsSeen.push(options)
    return createMockDriver(state)
  }
  return { factory, optionsSeen }
}

describe('connectImap', () => {
  it('passes auth credentials and tls options through to the driver', async () => {
    const state = createState()
    const { factory, optionsSeen } = makeFactory(state)

    await connectImap(
      {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        auth: { user: 'me', pass: 'secret' },
        tls: { rejectUnauthorized: false },
      },
      { factory },
    )

    expect(optionsSeen).toHaveLength(1)
    expect(optionsSeen[0]).toMatchObject({
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: { user: 'me', pass: 'secret' },
      tls: { rejectUnauthorized: false },
      logger: false,
    })
  })

  it('translates an OAuth2 access token into the driver auth shape', async () => {
    const state = createState()
    const { factory, optionsSeen } = makeFactory(state)

    await connectImap(
      {
        host: 'imap.gmail.com',
        port: 993,
        auth: { user: 'me@gmail.com', accessToken: 'ya29.token' },
      },
      { factory },
    )

    expect(optionsSeen[0].auth).toEqual({ user: 'me@gmail.com', accessToken: 'ya29.token' })
  })

  it('throws ImapError(auth-failed) when the driver reports authenticationFailed', async () => {
    const state = createState({
      connectShouldFail: Object.assign(new Error('Invalid credentials'), {
        authenticationFailed: true,
      }),
    })
    const { factory } = makeFactory(state)

    let threw: unknown
    try {
      await connectImap(
        { host: 'imap.example.com', port: 993, auth: { user: 'me', pass: 'wrong' } },
        { factory },
      )
    } catch (error) {
      threw = error
    }
    expect(threw).toBeInstanceOf(ImapError)
    expect((threw as ImapError).code).toBe('auth-failed')
    expect((threw as Error).message).toMatch(/Invalid credentials/)
  })

  it('throws ImapError(connection-failed) on generic connect errors', async () => {
    const state = createState({ connectShouldFail: new Error('ECONNREFUSED') })
    const { factory } = makeFactory(state)

    await expect(
      connectImap(
        { host: 'imap.example.com', port: 993, auth: { user: 'me', pass: 'p' } },
        { factory },
      ),
    ).rejects.toMatchObject({ code: 'connection-failed' })
  })
})

describe('ImapClient.listFolders', () => {
  it('normalizes driver entries (specialUse, delimiter, name)', async () => {
    const state = createState({
      folders: [
        { path: 'INBOX', delimiter: '/', subscribed: true, specialUse: '\\Inbox' },
        { path: 'Sent', delimiter: '/', subscribed: true, specialUse: '\\Sent' },
        { path: 'Personal/Travel', delimiter: '/', subscribed: false },
      ],
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    const folders = await client.listFolders()
    expect(folders).toEqual([
      { path: 'INBOX', name: 'INBOX', delimiter: '/', subscribed: true, specialUse: '\\Inbox' },
      { path: 'Sent', name: 'Sent', delimiter: '/', subscribed: true, specialUse: '\\Sent' },
      { path: 'Personal/Travel', name: 'Travel', delimiter: '/', subscribed: false },
    ])
  })
})

describe('ImapClient.selectFolder', () => {
  it('opens the mailbox and stores the current folder', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await expect(client.selectFolder('INBOX')).resolves.toBeUndefined()
    // Verifying state is exercised via subsequent listMessages calls.
  })

  it('translates NoSuchMailbox into ImapError(folder-not-found)', async () => {
    const state = createState({
      openShouldFail: Object.assign(new Error('No such mailbox'), { code: 'NoSuchMailbox' }),
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await expect(client.selectFolder('Bogus')).rejects.toMatchObject({ code: 'folder-not-found' })
  })
})

describe('ImapClient.listMessages', () => {
  it('passes since/search through to the driver and normalizes results newest-first', async () => {
    const state = createState({
      searchUids: [10, 11, 12, 13],
      fetchAllMessages: [
        {
          uid: 11,
          envelope: {
            from: [{ name: 'A', address: 'a@a' }],
            to: [{ address: 'me@x' }],
            subject: 'two',
            date: new Date('2026-04-30T00:00:00Z'),
          },
          flags: new Set(['\\Seen']),
          bodyStructure: { type: 'text/plain' },
        },
        {
          uid: 13,
          envelope: {
            from: [{ address: 'b@b' }],
            to: [{ address: 'me@x' }],
            subject: 'four',
            date: new Date('2026-05-01T00:00:00Z'),
          },
          flags: new Set(),
          bodyStructure: {
            type: 'multipart/mixed',
            childNodes: [
              { type: 'text/plain' },
              {
                type: 'application/pdf',
                disposition: 'attachment',
                dispositionParameters: { filename: 'a.pdf' },
              },
            ],
          },
        },
      ],
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    const since = new Date('2026-04-29T00:00:00Z')
    const summaries = await client.listMessages({
      folder: 'INBOX',
      limit: 2,
      since,
      search: 'invoice',
    })

    expect(state.searchCalls[0]).toMatchObject({ since, text: 'invoice' })
    expect(state.searchOptions[0]).toEqual({ uid: true })
    // limit=2 → tail of sorted UIDs is [12,13]; offset=0
    expect(state.fetchAllCalls[0].range).toEqual([12, 13])
    expect(state.fetchAllCalls[0].query).toMatchObject({
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
    })

    expect(summaries.map((s) => s.uid)).toEqual([13, 11])
    expect(summaries[0]).toMatchObject({
      subject: 'four',
      hasAttachments: true,
      flags: [],
    })
    expect(summaries[1]).toMatchObject({
      subject: 'two',
      hasAttachments: false,
      flags: ['\\Seen'],
    })
  })

  it('returns [] when search returns no UIDs', async () => {
    const state = createState({ searchUids: [] })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    expect(await client.listMessages({ folder: 'INBOX' })).toEqual([])
    expect(state.fetchAllCalls).toHaveLength(0)
  })

  it('respects the offset parameter', async () => {
    const state = createState({
      searchUids: [1, 2, 3, 4, 5],
      fetchAllMessages: [],
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await client.listMessages({ folder: 'INBOX', limit: 2, offset: 1 })
    // total=5, offset=1, limit=2 → start=2, end=4 → [3,4]
    expect(state.fetchAllCalls[0].range).toEqual([3, 4])
  })
})

describe('ImapClient.fetchMessage', () => {
  it('throws ImapError(message-not-found) when fetchOne returns false', async () => {
    const state = createState({ fetchOneMessage: false })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    await expect(client.fetchMessage(99)).rejects.toMatchObject({ code: 'message-not-found' })
  })

  it('decodes text + html bodies and surfaces attachments', async () => {
    const textBuf = new TextEncoder().encode('hello world')
    const htmlBuf = new TextEncoder().encode('<p>hello world</p>')
    const pdfBuf = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF

    const state = createState({
      fetchOneMessage: {
        uid: 42,
        envelope: {
          from: [{ name: 'Sender', address: 's@example.com' }],
          to: [{ address: 'me@example.com' }],
          cc: [{ address: 'cc@example.com' }],
          subject: 'Subject',
          date: new Date('2026-05-01T00:00:00Z'),
        },
        flags: new Set(['\\Seen']),
        headers: new TextEncoder().encode(
          'Subject: Subject\r\nReceived: hop1\r\nReceived: hop2\r\n',
        ),
        bodyStructure: {
          type: 'multipart/mixed',
          childNodes: [
            {
              type: 'multipart/alternative',
              childNodes: [
                { part: '1.1', type: 'text/plain' },
                { part: '1.2', type: 'text/html' },
              ],
            },
            {
              part: '2',
              type: 'application/pdf',
              disposition: 'attachment',
              dispositionParameters: { filename: 'spec.pdf' },
            },
          ],
        },
      },
      downloadResults: {
        '1.1': { meta: { contentType: 'text/plain', charset: 'utf-8' }, content: textBuf },
        '1.2': { meta: { contentType: 'text/html', charset: 'utf-8' }, content: htmlBuf },
        '2': {
          meta: { contentType: 'application/pdf', filename: 'spec.pdf' },
          content: pdfBuf,
        },
      },
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    const msg = await client.fetchMessage(42)

    expect(state.fetchOneCalls[0].seq).toBe('42')
    expect(state.fetchOneCalls[0].query).toMatchObject({ uid: true, envelope: true, headers: true })
    expect(state.downloadCalls[0].range).toBe(42)
    expect(new Set(state.downloadCalls[0].parts)).toEqual(new Set(['1.1', '1.2', '2']))

    expect(msg.uid).toBe(42)
    expect(msg.subject).toBe('Subject')
    expect(msg.cc).toEqual([{ address: 'cc@example.com' }])
    expect(msg.text).toBe('hello world')
    expect(msg.html).toBe('<p>hello world</p>')
    expect(msg.attachments).toHaveLength(1)
    expect(msg.attachments[0]).toMatchObject({
      filename: 'spec.pdf',
      contentType: 'application/pdf',
      size: 4,
      inline: false,
    })
    expect(Array.from(msg.attachments[0].content)).toEqual([0x25, 0x50, 0x44, 0x46])
    expect(msg.headers).toMatchObject({ subject: 'Subject', received: ['hop1', 'hop2'] })
  })

  it('omits cc when the envelope has no Cc addresses', async () => {
    const state = createState({
      fetchOneMessage: {
        uid: 1,
        envelope: { from: [{ address: 'a@a' }], to: [{ address: 'b@b' }], subject: 'x' },
        flags: new Set(),
        bodyStructure: { type: 'text/plain' },
      },
    })
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    const msg = await client.fetchMessage(1)
    expect('cc' in msg).toBe(false)
  })
})

describe('ImapClient flag + move + delete', () => {
  it('markRead and markUnread call messageFlagsAdd/Remove with \\Seen', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    await client.markRead(7)
    await client.markUnread(7)

    expect(state.flagsAddCalls).toEqual([{ range: [7], flags: ['\\Seen'] }])
    expect(state.flagsRemoveCalls).toEqual([{ range: [7], flags: ['\\Seen'] }])
  })

  it('moveMessage calls messageMove with the destination folder', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    await client.moveMessage(7, 'Archive')
    expect(state.moveCalls).toEqual([{ range: [7], destination: 'Archive' }])
  })

  it('deleteMessage calls messageDelete with uid:true', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )
    await client.selectFolder('INBOX')

    await client.deleteMessage(7)
    expect(state.deleteCalls).toEqual([{ range: [7] }])
  })

  it('throws no-folder-selected when fetchMessage runs before selectFolder', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await expect(client.fetchMessage(1)).rejects.toMatchObject({ code: 'no-folder-selected' })
  })
})

describe('ImapClient.disconnect', () => {
  it('logs out the driver and rejects further operations with not-connected', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await client.disconnect()
    expect(state.logoutCalls).toBe(1)

    await expect(client.listFolders()).rejects.toMatchObject({ code: 'not-connected' })
  })

  it('falls back to close() when logout throws', async () => {
    const state = createState()
    const driver = createMockDriver(state)
    driver.logout = vi.fn().mockRejectedValue(new Error('logout failed'))
    const factory: ImapFlowFactory = () => driver
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await expect(client.disconnect()).resolves.toBeUndefined()
    expect(state.closeCalls).toBe(1)
  })

  it('is idempotent', async () => {
    const state = createState()
    const { factory } = makeFactory(state)
    const client = await connectImap(
      { host: 'h', port: 993, auth: { user: 'u', pass: 'p' } },
      { factory },
    )

    await client.disconnect()
    await client.disconnect()
    expect(state.logoutCalls).toBe(1)
  })
})
