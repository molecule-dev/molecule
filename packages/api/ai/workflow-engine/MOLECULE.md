# @molecule/api-ai-workflow-engine

`@molecule/api-ai-workflow-engine` — trigger / condition / action
workflow runner with pluggable handler registry + optional
AI-assisted step suggestions.

Extracted from ai-workflow-automator flagship. Use it like an
embeddable Zapier engine inside your app.

## Quick Start

```ts
import { createWorkflowEngine } from '@molecule/api-ai-workflow-engine'

const engine = createWorkflowEngine({
  triggers: {
    'webhook.received': async (ctx) => ctx.payload,
  },
  actions: {
    'http.post': async ({ url, body }) => fetch(String(url), { method: 'POST', body: JSON.stringify(body) }),
    'slack.message': async ({ channel, text }) => slackClient.chat.postMessage({ channel, text }),
  },
})

const run = await engine.execute({
  trigger: 'webhook.received',
  triggerInput: { payload: req.body },
  steps: [
    { type: 'condition', expression: '$.event === "purchase"' },
    { type: 'action', action: 'slack.message', params: { channel: '#sales', text: 'New sale: ${$.amount}' } },
  ],
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-workflow-engine @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `ActionStep`

A step that invokes a registered action handler with resolved params.

```typescript
interface ActionStep {
  type: 'action'
  /** Action key registered with the engine. */
  action: string
  /** Param template — `${$.x.y}` placeholders are resolved against context. */
  params?: Record<string, unknown>
  /** Where to write the action's return value into the context. */
  output?: string
}
```

#### `AIPromptStep`

A step that sends a prompt to the bonded AI provider and writes the response into context.

```typescript
interface AIPromptStep {
  type: 'ai_prompt'
  prompt: string
  /** Field on context to write the model's text response. */
  output: string
}
```

#### `ConditionStep`

A step that evaluates a JS expression and short-circuits the run on false.

```typescript
interface ConditionStep {
  type: 'condition'
  /** JS expression evaluated against `$` (the workflow context). */
  expression: string
}
```

#### `DelayStep`

A step that pauses workflow execution for a fixed number of milliseconds.

```typescript
interface DelayStep {
  type: 'delay'
  /** Milliseconds to sleep. */
  ms: number
}
```

#### `EngineOptions`

Configuration passed to `createWorkflowEngine` — trigger and action handler maps.

```typescript
interface EngineOptions {
  triggers: Record<string, (ctx: Record<string, unknown>) => Promise<unknown> | unknown>
  actions: Record<string, (params: Record<string, unknown>) => Promise<unknown> | unknown>
}
```

#### `WorkflowDefinition`

Describes a complete workflow: which trigger fires it and what steps to run.

```typescript
interface WorkflowDefinition {
  trigger: string
  triggerInput?: Record<string, unknown>
  steps: WorkflowStep[]
}
```

#### `WorkflowEngine`

Public interface for the workflow engine returned by `createWorkflowEngine`.

```typescript
interface WorkflowEngine {
  execute(definition: WorkflowDefinition): Promise<WorkflowRun>
}
```

#### `WorkflowRun`

Result returned by `WorkflowEngine.execute` — overall outcome plus per-step trace.

```typescript
interface WorkflowRun {
  ok: boolean
  context: Record<string, unknown>
  /** What happened at each step: 'executed' | 'skipped' | 'errored'. */
  trace: Array<{
    index: number
    type: WorkflowStepType
    outcome: 'executed' | 'skipped' | 'errored'
    error?: string
  }>
}
```

### Types

#### `WorkflowStep`

Discriminated union of all step types that a workflow definition may contain.

```typescript
type WorkflowStep = ConditionStep | ActionStep | DelayStep | AIPromptStep
```

#### `WorkflowStepType`

```typescript
type WorkflowStepType = 'condition' | 'action' | 'delay' | 'http' | 'ai_prompt'
```

### Functions

#### `createWorkflowEngine(opts)`

Creates a `WorkflowEngine` instance wired with the provided trigger and action handlers.

```typescript
function createWorkflowEngine(opts: EngineOptions): WorkflowEngine
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`
