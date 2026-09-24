/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the tools run through the LLM agent
 * bond over the Anthropic chat bond against the real local filesystem. Only
 * the network is mocked: `fetch` returns real Messages-API SSE streams (the
 * model asks for `read_file`, then answers).
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAiProvider } from '@molecule/api-ai'
import { requireProvider, setProvider as setAgents } from '@molecule/api-ai-agents'
import { provider as agents } from '@molecule/api-ai-agents-llm'
import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'

import { buildAgentPrompt, buildTools, createLocalBackend } from '../index.js'

/**
 * Builds a streaming fetch Response from Anthropic SSE event objects.
 *
 * @param events - The SSE `data:` payloads, in order.
 * @returns A minimal streaming Response.
 */
function sseResponse(events: Array<Record<string, unknown>>): Response {
  const text = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(text), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('gives an agent a read-only tool set that really reads the project file', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const { name } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      name: string
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sseResponse([
          { type: 'message_start', message: { usage: { input_tokens: 300 } } },
          {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'tool_use', id: 'toolu_1', name: 'read_file' },
          },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'input_json_delta', partial_json: '{"path":"package.json"}' },
          },
          { type: 'content_block_stop', index: 0 },
          { type: 'message_delta', usage: { output_tokens: 9 } },
          { type: 'message_stop' },
        ]),
      )
      .mockResolvedValueOnce(
        sseResponse([
          { type: 'message_start', message: { usage: { input_tokens: 500 } } },
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: `The package is named "${name}".` },
          },
          { type: 'content_block_stop', index: 0 },
          { type: 'message_stop' },
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)

    setAiProvider(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setAgents(agents)

    const backend = createLocalBackend(process.cwd())
    const tools = buildTools(backend, { include: ['list_files', 'read_file', 'search_files'] })
    const system = buildAgentPrompt({
      agentName: 'Repo Assistant',
      projectRoot: backend.projectRoot,
      tools: tools.map((tool) => tool.name),
    })

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'list_files',
      'read_file',
      'search_files',
    ])
    expect(system).toContain('Repo Assistant')

    const result = await requireProvider().run({
      system,
      tools,
      task: 'What is the "name" field in package.json?',
    })

    expect(result.output).toBe(`The package is named "${name}".`)
    const call = result.steps[0]?.toolCalls[0]
    expect(call?.name).toBe('read_file')
    expect(call?.isError).toBeFalsy()
    expect(JSON.stringify(call?.result)).toContain(`"name\\": \\"${name}\\"`)
  })
})
