/**
 * Provider conformance: keep_alive liveness signal.
 *
 * Every streaming AI provider MUST yield `{ type: 'keep_alive' }` when it
 * receives data from the upstream API that produces no other ChatEvent (an SSE
 * ping, an empty delta, or buffered tool-input/argument chunks). Without it, the
 * consumer's inter-event stream timeout false-fires while the model is alive but
 * emitting only silent chunks (e.g. streaming a large tool input). See the
 * `ChatEvent.keep_alive` contract in ../types.ts.
 *
 * This test auto-discovers every `bonds/ai/<name>` provider so newly added
 * providers are held to the contract automatically — a new streaming provider
 * that forgets keep_alive fails here.
 *
 * It is a static source check (not behavioral) so it can cover every provider
 * regardless of its upstream SSE format; the trade-off is it can't catch a
 * provider that streams via a mechanism none of the heuristics below recognise.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
// packages/api/core/ai/src/__tests__ → packages/api/bonds/ai
const bondsDir = resolve(here, '../../../../bonds/ai')

/** Signals that a provider reads a streaming response (and so must emit keep_alive). */
const STREAMING_SIGNALS = /getReader|reader\.read|text\/event-stream|parseStreamingResponse/
/** The required liveness emission. */
const KEEP_ALIVE = /type:\s*['"]keep_alive['"]/

const providers = existsSync(bondsDir)
  ? readdirSync(bondsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, file: join(bondsDir, d.name, 'src', 'provider.ts') }))
      .filter((p) => existsSync(p.file))
  : []

describe('AI provider keep_alive conformance', () => {
  it('discovers the provider bonds', () => {
    expect(providers.length).toBeGreaterThan(0)
  })

  for (const { name, file } of providers) {
    it(`${name}: emits keep_alive on silent chunks if it streams`, () => {
      const src = readFileSync(file, 'utf8')
      // Non-streaming stubs (no upstream read loop) are exempt.
      if (!STREAMING_SIGNALS.test(src)) return
      expect(
        KEEP_ALIVE.test(src),
        `Streaming provider "${name}" must yield { type: 'keep_alive' } on upstream chunks that produce no other ChatEvent ` +
          `(SSE ping, empty delta, or buffered tool-input). See the ChatEvent.keep_alive contract in core/ai/types.ts.`,
      ).toBe(true)
    })
  }
})
