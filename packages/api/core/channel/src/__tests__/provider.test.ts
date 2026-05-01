import { beforeEach, describe, expect, it, vi } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  requireProviderByName,
  setProvider,
} from '../provider.js'
import type {
  ChannelFeatures,
  ChannelProvider,
  InboundMessage,
  OutboundMessage,
  SendResult,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock channel providers
// ---------------------------------------------------------------------------

const buildFeatures = (overrides: Partial<ChannelFeatures> = {}): ChannelFeatures => ({
  text: true,
  buttons: true,
  attachments: true,
  threads: true,
  signedWebhooks: true,
  ...overrides,
})

const buildProvider = (
  name: string,
  overrides: Partial<ChannelProvider> = {},
): ChannelProvider => ({
  name,
  sendMessage: vi.fn(async () => ({
    messageId: `${name}-msg-1`,
    deliveredAt: new Date('2024-01-15T00:00:00Z'),
  })),
  verifyWebhookSignature: vi.fn(() => true),
  parseInbound: vi.fn(
    (): InboundMessage => ({
      from: 'U_TEST',
      channel: name,
      text: 'hi',
      receivedAt: new Date('2024-01-15T00:00:00Z'),
    }),
  ),
  listSupportedFeatures: vi.fn(() => buildFeatures()),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('channel provider bond', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  // -------------------------------------------------------------------------
  // setProvider (singleton)
  // -------------------------------------------------------------------------

  describe('setProvider(provider) — singleton', () => {
    it('registers a singleton provider', () => {
      const slack = buildProvider('slack')
      setProvider(slack)
      expect(getProvider()).toBe(slack)
    })

    it('overwrites a previous singleton', () => {
      const slack = buildProvider('slack')
      const discord = buildProvider('discord')
      setProvider(slack)
      setProvider(discord)
      expect(getProvider()).toBe(discord)
    })
  })

  // -------------------------------------------------------------------------
  // setProvider (named)
  // -------------------------------------------------------------------------

  describe('setProvider(name, provider) — named', () => {
    it('registers a named provider', () => {
      const slack = buildProvider('slack')
      setProvider('slack', slack)
      expect(getProviderByName('slack')).toBe(slack)
    })

    it('supports multiple named providers concurrently', () => {
      const slack = buildProvider('slack')
      const discord = buildProvider('discord')
      const whatsapp = buildProvider('whatsapp')
      setProvider('slack', slack)
      setProvider('discord', discord)
      setProvider('whatsapp', whatsapp)
      expect(getProviderByName('slack')).toBe(slack)
      expect(getProviderByName('discord')).toBe(discord)
      expect(getProviderByName('whatsapp')).toBe(whatsapp)
    })

    it('auto-registers the first named provider as singleton fallback', () => {
      const slack = buildProvider('slack')
      setProvider('slack', slack)
      expect(getProvider()).toBe(slack)
    })

    it('does not overwrite singleton when a second named provider is added', () => {
      const slack = buildProvider('slack')
      const discord = buildProvider('discord')
      setProvider('slack', slack)
      setProvider('discord', discord)
      expect(getProvider()).toBe(slack)
    })
  })

  // -------------------------------------------------------------------------
  // getProvider / getProviderByName / hasProvider
  // -------------------------------------------------------------------------

  describe('getProvider', () => {
    it('returns null when no provider is bonded', () => {
      expect(getProvider()).toBeNull()
    })
  })

  describe('getProviderByName', () => {
    it('returns null for unknown name', () => {
      expect(getProviderByName('nonexistent')).toBeNull()
    })
  })

  describe('getAllProviders', () => {
    it('returns empty map when none bonded', () => {
      expect(getAllProviders().size).toBe(0)
    })

    it('returns all named providers keyed by name', () => {
      const slack = buildProvider('slack')
      const telegram = buildProvider('telegram')
      setProvider('slack', slack)
      setProvider('telegram', telegram)
      const all = getAllProviders()
      expect(all.size).toBe(2)
      expect(all.get('slack')).toBe(slack)
      expect(all.get('telegram')).toBe(telegram)
    })
  })

  describe('hasProvider', () => {
    it('returns false when no singleton is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('returns true when a singleton is bonded', () => {
      setProvider(buildProvider('slack'))
      expect(hasProvider()).toBe(true)
    })

    it('returns false for unknown named provider', () => {
      expect(hasProvider('nonexistent')).toBe(false)
    })

    it('returns true for a bonded named provider', () => {
      setProvider('slack', buildProvider('slack'))
      expect(hasProvider('slack')).toBe(true)
    })

    it('distinguishes between different names', () => {
      setProvider('slack', buildProvider('slack'))
      expect(hasProvider('discord')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // requireProvider / requireProviderByName
  // -------------------------------------------------------------------------

  describe('requireProvider', () => {
    it('throws when no provider is bonded', () => {
      expect(() => requireProvider()).toThrow(/Channel provider not configured/)
    })

    it('returns the bonded singleton provider', () => {
      const slack = buildProvider('slack')
      setProvider(slack)
      expect(requireProvider()).toBe(slack)
    })
  })

  describe('requireProviderByName', () => {
    it('throws when no provider is bonded under the name', () => {
      expect(() => requireProviderByName('messenger')).toThrow(/messenger/)
    })

    it('returns the named provider when bonded', () => {
      const messenger = buildProvider('messenger')
      setProvider('messenger', messenger)
      expect(requireProviderByName('messenger')).toBe(messenger)
    })
  })
})

// ---------------------------------------------------------------------------
// Type-level smoke tests
// ---------------------------------------------------------------------------

describe('channel types', () => {
  it('accepts a minimal ChannelProvider implementation', () => {
    const provider: ChannelProvider = {
      name: 'fake',
      async sendMessage(): Promise<SendResult> {
        return { messageId: 'm1', deliveredAt: new Date(0) }
      },
      verifyWebhookSignature(): boolean {
        return false
      },
      parseInbound(): InboundMessage {
        return {
          from: 'U',
          channel: 'fake',
          receivedAt: new Date(0),
        }
      },
      listSupportedFeatures(): ChannelFeatures {
        return {
          text: true,
          buttons: false,
          attachments: false,
          threads: false,
          signedWebhooks: false,
        }
      },
    }
    expect(provider.name).toBe('fake')
    expect(typeof provider.sendMessage).toBe('function')
    expect(typeof provider.verifyWebhookSignature).toBe('function')
    expect(typeof provider.parseInbound).toBe('function')
    expect(typeof provider.listSupportedFeatures).toBe('function')
  })

  it('accepts every OutboundMessage kind', () => {
    const text: OutboundMessage = { kind: 'text', text: 'hi' }
    const rich: OutboundMessage = {
      kind: 'rich',
      text: 'pick',
      buttons: [
        { label: 'Yes', value: 'y' },
        { label: 'No', value: 'n' },
      ],
      thread_id: 't1',
    }
    const media: OutboundMessage = {
      kind: 'media',
      attachments: [{ url: 'https://example.com/x.png', contentType: 'image/png' }],
    }
    expect(text.kind).toBe('text')
    expect(rich.buttons?.length).toBe(2)
    expect(media.attachments?.[0]?.url).toContain('x.png')
  })

  it('accepts an InboundMessage with optional fields', () => {
    const msg: InboundMessage = {
      from: '+15555550100',
      channel: 'whatsapp',
      receivedAt: new Date('2024-02-02T00:00:00Z'),
    }
    expect(msg.text).toBeUndefined()
    expect(msg.attachments).toBeUndefined()
    expect(msg.payload).toBeUndefined()
  })
})
