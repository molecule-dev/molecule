# @molecule/api-ai-agents-llm

LLM-backed AI agents provider for molecule.dev — the batteries-included
tool-calling loop that implements the `@molecule/api-ai-agents` core contract.

Ships a default `provider` (`name: 'llm'`) that drives a model↔tool loop over
the swappable `ai` chat bond (`@molecule/api-ai`): it calls the model,
executes any tools the model requests via each `AITool.execute()`, feeds the
results back, and repeats until the model stops calling tools (or the
`maxSteps` budget is exhausted). Bond it once at startup, then drive it from
anywhere via the `@molecule/api-ai-agents` accessor.

## Quick Start

```typescript
import { bond } from '@molecule/api-bond'
import { requireProvider } from '@molecule/api-ai-agents'
import { provider as agents } from '@molecule/api-ai-agents-llm'
import type { AITool } from '@molecule/api-ai'

// Wire at startup (an `ai` provider must already be bonded).
bond('ai-agents', agents)

const myTool: AITool = {
  name: 'add',
  description: 'Add two numbers',
  parameters: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b'],
  },
  execute: async (input) => {
    const { a, b } = input as { a: number; b: number }
    return a + b
  },
}

const result = await requireProvider().run({
  task: 'What is 1 + 2? Use the add tool.',
  tools: [myTool],
})
console.log(result.output) // final assistant answer
console.log(result.steps)  // intermediate tool calls + results
console.log(result.usage)  // token usage summed across all model calls
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-agents-llm @molecule/api-ai @molecule/api-ai-agents @molecule/api-i18n
```

## API

### Classes

#### `AgentRunError`

Thrown by `run()` when the agentic loop fails partway through — a provider
API error (rate limit, auth, overload, network), an abort, or any other
exception raised while draining a model turn or executing a tool.

### Constants

#### `provider`

The LLM-backed AI agents provider: a tool-calling loop over the bonded `ai`
chat provider.

Bond it with `bond('ai-agents', provider)` and drive it with
`requireProvider().run({ task, tools })`. Requires a bonded `ai` provider
whose model supports tool use.

```typescript
const provider: AIAgentsProvider
```

## Core Interface
Implements `@molecule/api-ai-agents` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-agents'
import { provider } from '@molecule/api-ai-agents-llm'

export function setupAiAgentsLlm(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-agents` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-agents`
- `@molecule/api-i18n`

**Requires a bonded `ai` provider** (`bond('ai', provider)` or a named
provider selected via `run({ provider: 'anthropic' })`) whose model supports
tool use — this agent has no model of its own; it orchestrates the `ai` bond.

The loop executes your tools: each model `tool_use` runs the matching
`AITool.execute(input)` and the return value is fed back as a `tool_result`.
A thrown tool error or an unknown tool name becomes an error `tool_result`
(recorded with `isError: true`) instead of aborting the run, so the model can
recover. `run()` requires exactly one of `task` (a single user turn) or
`messages` (a full history); it throws if neither — or both — is supplied.

Every model turn streams by default (`input.stream` — set `false` to force
non-streaming) and, when `input.cacheControl` is set, is passed through to
`ai.chat()` on every turn so a provider that supports prompt caching (e.g.
`@molecule/api-ai-anthropic`) doesn't re-bill the identical `system` + `tools`
prefix on each of up to `maxSteps` turns. Note `onEvent` is only an
INCREMENTAL live hook while streaming — with `stream: false` it fires once
per turn with the whole response.

Failure semantics (how to tell failure modes apart):
- **Tool failure** (throwing `execute()`, unknown tool name) — NON-fatal:
  recorded on the step with `isError: true` and fed back to the model.
- **AI provider API failure** (rate limit, bad key, overload, network — the
  `ai` bond emits an in-band `error` ChatEvent), **an abort, or any other
  mid-run exception** — FATAL: `run()` rejects with an `AgentRunError`
  (message text unchanged from a plain `Error`) carrying the `usage` and
  `steps` accumulated across every turn that completed before the failure —
  a caller that meters spend can book that partial usage instead of losing
  it. `run()` never resolves with a silently empty `output`, so an empty
  `result.output` means the model genuinely produced no text, not that the
  API failed.
- **Step budget exhausted** — resolves normally; `output` is the last
  assistant text or an explicit "step budget exhausted" note.

Swappable like any bond: replace this LLM agent with your own
`AIAgentsProvider` via `bond('ai-agents', myProvider)` — nothing else changes.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), give the
agent a task that genuinely needs several tool calls, adapt each item to this
app's actual agent surface + its registered tools, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A multi-step task drives a real agentic LOOP, not one shot: `run()`
  records more than one entry in `result.steps`, and each `toolCalls[]` names a
  tool the agent was actually given. Confirm each tool's `execute()` truly RAN
  via its own side effect / log / the resource it touched — not that the model
  narrated calling it — and that `result.output` is a final answer that USES
  those tool results to complete the task.
- [ ] The loop TERMINATES cleanly: it either reaches a done state (the model
  stops calling tools, so `run()` returns the final `output`) or hits the
  `maxSteps` cap (default 10) and stops with the step-budget note as `output`.
  It never spins forever or ping-pongs the same tool endlessly — a step cap
  exists and is honored: `result.steps.length <= maxSteps`, and a task built to
  loop past the budget stops AT the cap rather than running away.
- [ ] A tool that fails mid-loop is handled, not fatal: when a tool's
  `execute()` throws (or the model names a tool that was never registered), that
  call is caught and fed back to the model as an error tool result — the
  matching `toolCalls[]` has `isError: true`, the loop continues, and the run
  still returns a result. The request never crashes. (Only an `ai`-provider
  failure rejects — as `AgentRunError` carrying the partial `usage`/`steps` —
  and it surfaces as a handled error, not an unhandled throw.)
- [ ] If the run streams (the default), the UI shows progress INCREMENTALLY:
  the `onEvent` hook fires per `ChatEvent` (thinking `text`, `tool_use`, `done`)
  as they arrive, so the user watches the agent think + call tools live — not a
  long freeze then one blob at the end.
- [ ] SECURITY — the agent can call ONLY the tools handed to this run: a tool
  name the model invents (or one injected via the task or a tool's own output)
  that was never in `input.tools` is refused as an `unknown tool` error, not
  executed. Tool execution stays server-side under its backend's guards (e.g.
  the `@molecule/api-ai-tools` `pathGuards`/`redactSecrets`/`blockCommand`), and
  the `ai` provider key lives on the API, never the client. Feed a
  prompt-injected instruction (in the task, or in data a tool returns) telling
  the agent to escape the workspace, run a privileged command, or exfiltrate a
  secret, and confirm it CANNOT do anything the user couldn't do directly.
