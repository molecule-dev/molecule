# @molecule/api-ai-agents

AI agents core for molecule.dev — the swappable tool-calling agent contract.

Interface-only core: it defines the `AIAgentsProvider` interface (a
batteries-included tool-calling agent) plus the bond accessor
(`setProvider`/`getProvider`/`requireProvider`/…). The default implementation
— a model↔tool loop over the swappable `ai` chat bond (`@molecule/api-ai`) —
ships in the `@molecule/api-ai-agents-llm` bond package. Bond a provider once
at startup, then drive it from anywhere.

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
`core`

## Installation
```bash
npm install @molecule/api-ai-agents
```

## API

### Interfaces

#### `AgentRunInput`

Input for a single agent run.

Exactly one of `task` or `messages` is required — `task` is a convenience for
a single user turn; `messages` supplies a full conversation history.

```typescript
interface AgentRunInput {
  /** Convenience: a single user task string (seeds one `user` message). */
  task?: string
  /** A full message history to seed the conversation (mutually exclusive with `task`). */
  messages?: ChatMessage[]
  /** Optional system prompt passed to the model on every turn. */
  system?: string
  /** Tools the agent may call; each call runs the matching tool's `execute()`. */
  tools?: AITool[]
  /** Maximum model↔tool round-trips before the loop stops (default 10). */
  maxSteps?: number
  /** Model identifier passed through to the AI provider. */
  model?: string
  /** Named AI provider to use; falls back to the singleton when omitted. */
  provider?: string
  /** Sampling temperature passed through to the AI provider. */
  temperature?: number
  /** Abort signal to cancel in-flight model requests and stop tool execution. */
  signal?: AbortSignal
  /** Optional live hook invoked for every streamed `ChatEvent`. */
  onEvent?: (event: ChatEvent) => void
}
```

#### `AgentRunResult`

Result of a completed agent run.

```typescript
interface AgentRunResult {
  /** Final assistant text (or a note if the step budget was exhausted). */
  output: string
  /** Every intermediate step that invoked tools, in order. */
  steps: AgentStep[]
  /** Token usage summed across all model calls in the run. */
  usage: TokenUsage
}
```

#### `AgentStep`

One round-trip of the agent loop: the assistant text (if any) plus every tool
call executed before the next model turn.

```typescript
interface AgentStep {
  /** Assistant text emitted on this step, if any. */
  text?: string
  /** Tool calls executed on this step. */
  toolCalls: AgentToolCall[]
}
```

#### `AgentToolCall`

A single tool invocation performed during a run.

```typescript
interface AgentToolCall {
  /** Provider-assigned tool-use id, echoed back in the tool result. */
  id: string
  /** Name of the tool the model called. */
  name: string
  /** Raw input the model produced for the tool. */
  input: unknown
  /** Value returned by `execute()`, or an error string when the call failed. */
  result: unknown
  /** `true` when the tool threw or the name was unknown. */
  isError?: boolean
}
```

#### `AIAgentsConfig`

Config options for an AI agents bond.

```typescript
interface AIAgentsConfig {
  [key: string]: unknown
}
```

#### `AIAgentsProvider`

AI agents provider interface.

Implemented by the default provider in this package (and swappable via
`bond('ai-agents', provider)`). Runs an agentic tool-calling loop over the
bonded `ai` chat provider.

```typescript
interface AIAgentsProvider {
  /** Provider identifier (the default implementation reports `'default'`). */
  readonly name: string
  /**
   * Runs the agentic loop to completion and returns the final result.
   *
   * @param input - The task/messages, tools, and loop options.
   * @returns The final output, the recorded steps, and total token usage.
   */
  run(input: AgentRunInput): Promise<AgentRunResult>
}
```

### Functions

#### `getAllProviders()`

Retrieves all named AI agents providers as a Map keyed by provider name.

```typescript
function getAllProviders(): Map<string, AIAgentsProvider>
```

**Returns:** Map of provider name → AIAgentsProvider.

#### `getProvider()`

Retrieves the singleton AI agents provider, or `null` if none is bonded.

Falls back to a single named provider when no singleton is bonded. When
multiple named providers are bonded the fallback declines (returns `null`)
because the choice is ambiguous.

```typescript
function getProvider(): AIAgentsProvider | null
```

**Returns:** The bonded AI agents provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named AI agents provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): AIAgentsProvider | null
```

- `name` — The provider name.

**Returns:** The named AI agents provider, or `null`.

#### `hasProvider(name)`

Checks whether an AI agents provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional provider name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI agents provider, throwing if none is bonded.

```typescript
function requireProvider(): AIAgentsProvider
```

**Returns:** The bonded AI agents provider.

#### `setProvider(provider)`

Registers an AI agents provider in singleton mode.

```typescript
function setProvider(provider: AIAgentsProvider): void
```

- `provider` — The default provider implementation for this process.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Agents | `@molecule/api-ai-agents-llm` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

**Requires a bonded `ai` provider** (`bond('ai', provider)` or a named
provider selected via `run({ provider: 'anthropic' })`) whose model supports
tool use — the agent has no model of its own; it orchestrates the `ai` bond.

This package is the abstract contract only. To get a working agent, also bond
the `@molecule/api-ai-agents-llm` provider (or your own `AIAgentsProvider`)
via `bond('ai-agents', provider)` — nothing else changes.
