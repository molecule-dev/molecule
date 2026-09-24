/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The outside world is replaced at its
 * boundaries only: the AI model is a scripted `AIProvider` bonded through the
 * real `@molecule/api-ai` core, and the `@molecule/api-database` DataStore is
 * mocked with a tiny in-memory `reports` table.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
interface Where {
  field: string
  operator: string
  value: unknown
}

const { table } = vi.hoisted(() => ({ table: [] as Record<string, unknown>[] }))

vi.mock('@molecule/api-database', () => {
  const matches = (row: Row, where: Where[] = []): boolean =>
    where.every((w) => row[w.field] === w.value)
  return {
    create: vi.fn(async (_table: string, data: Row) => {
      table.push({ ...data })
      return { data, affected: 1 }
    }),
    findMany: vi.fn(async (_table: string, options: { where?: Where[] } = {}) =>
      table.filter((row) => matches(row, options.where)),
    ),
    count: vi.fn(
      async (_table: string, where?: Where[]) => table.filter((row) => matches(row, where)).length,
    ),
    updateById: vi.fn(async (_table: string, id: string, data: Row) => {
      const row = table.find((r) => r.id === id)
      if (row) Object.assign(row, data)
      return { data: row ?? null, affected: row ? 1 : 0 }
    }),
  }
})

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'
import { requireProvider as requireAI, setProvider as setAIProvider } from '@molecule/api-ai'
import { count, create, findMany, updateById } from '@molecule/api-database'

import type { ContentModerationProvider, ModerationResult, Report } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

/** A scripted model: flags anything containing "idiot" as harassment. */
const scriptedModel: AIProvider = {
  name: 'scripted',
  async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
    const text = String(params.messages[0]?.content ?? '')
    const flagged = text.includes('idiot')
    const json = JSON.stringify({
      flagged,
      categories: [{ category: 'harassment', flagged, score: flagged ? 0.97 : 0.02 }],
    })
    yield { type: 'text', content: json.slice(0, 10) }
    yield { type: 'text', content: json.slice(10) }
  },
}

describe('README @example', () => {
  it('bonds an app-implemented provider, blocks flagged content and runs the report workflow', async () => {
    setAIProvider(scriptedModel)

    const SYSTEM =
      'You are a content moderator. Reply ONLY with JSON: {"flagged": boolean, ' +
      '"categories": [{"category": string, "flagged": boolean, "score": number}]}'
    async function classify(ai: AIProvider, content: string): Promise<ModerationResult> {
      let reply = ''
      const messages = [{ role: 'user' as const, content }]
      for await (const event of ai.chat({ system: SYSTEM, messages, maxTokens: 300 })) {
        if (event.type === 'text') reply += event.content
        if (event.type === 'error') throw new Error(event.message)
      }
      return JSON.parse(reply) as ModerationResult
    }

    const moderation: ContentModerationProvider = {
      name: 'app-ai',
      check: (content) => classify(requireAI(), content),
      checkImage: async () => ({ flagged: false, categories: [] }),
      async report(input) {
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        const row: Report = { id, ...input, status: 'pending', createdAt: now, updatedAt: now }
        await create('reports', { ...row })
        return row
      },
      async getReports({ limit = 20, offset = 0, status = 'pending' } = {}) {
        const where = [{ field: 'status', operator: '=' as const, value: status }]
        const orderBy = [{ field: 'createdAt', direction: 'asc' as const }]
        const data = await findMany<Report>('reports', { where, limit, offset, orderBy })
        return { data, total: await count('reports', where), limit, offset }
      },
      async resolveReport(id, { action, reason, resolvedBy }) {
        const status = action === 'dismiss' ? 'dismissed' : 'resolved'
        const updatedAt = new Date().toISOString()
        await updateById('reports', id, {
          status,
          resolution: reason ?? action,
          resolvedBy,
          updatedAt,
        })
      },
    }

    setProvider(moderation)

    const result = await requireProvider().check('user-submitted comment text')
    expect(result.flagged).toBe(false)

    const bad = await requireProvider().check('you are an idiot')
    expect(bad).toEqual({
      flagged: true,
      categories: [{ category: 'harassment', flagged: true, score: 0.97 }],
    })

    const report = await requireProvider().report({
      resourceType: 'comment',
      resourceId: 'c_1',
      reporterId: 'u_2',
      reason: 'harassment',
    })
    expect(report.status).toBe('pending')
    const queue = await requireProvider().getReports()
    expect(queue.total).toBe(1)
    expect(queue.data[0]?.id).toBe(report.id)

    await requireProvider().resolveReport(report.id, { action: 'reject', resolvedBy: 'mod_1' })
    expect((await requireProvider().getReports()).total).toBe(0)
    expect(table[0]).toMatchObject({
      status: 'resolved',
      resolution: 'reject',
      resolvedBy: 'mod_1',
    })
  })
})
