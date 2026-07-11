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
npm install @molecule/api-ai-agents-llm
```

## API

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

**Requires a bonded `ai` provider** (`bond('ai', provider)` or a named
provider selected via `run({ provider: 'anthropic' })`) whose model supports
tool use — this agent has no model of its own; it orchestrates the `ai` bond.

The loop executes your tools: each model `tool_use` runs the matching
`AITool.execute(input)` and the return value is fed back as a `tool_result`.
A thrown tool error or an unknown tool name becomes an error `tool_result`
(recorded with `isError: true`) instead of aborting the run, so the model can
recover. `run()` requires exactly one of `task` (a single user turn) or
`messages` (a full history); it throws if neither is supplied.

Swappable like any bond: replace this LLM agent with your own
`AIAgentsProvider` via `bond('ai-agents', myProvider)` — nothing else changes.
