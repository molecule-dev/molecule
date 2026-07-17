# @molecule/api-ai-workflow-engine

`@molecule/api-ai-workflow-engine` — trigger / condition / action
workflow runner with pluggable handler registry + an optional AI
`ai_prompt` step (send a templated prompt to the bonded AI provider
mid-run).

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
    'slack.message': async ({ channel, text }) => slackClient.chat.postMessage({ channel, text }),
  },
})

const run = await engine.execute({
  trigger: 'webhook.received',
  triggerInput: { payload: req.body },
  steps: [
    { type: 'condition', expression: '$.event === "purchase"' },
    // Native HTTP step — routed through the swappable `@molecule/api-http` core:
    { type: 'http', method: 'POST', url: 'https://hooks.example.com/${$.id}', body: { amount: '${$.amount}' }, output: 'webhook' },
    { type: 'action', action: 'slack.message', params: { channel: '#sales', text: 'New sale: ${$.amount}' } },
  ],
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-workflow-engine @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-http @molecule/api-i18n @molecule/api-middleware-validation
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
  /**
   * Custom condition evaluator. When provided it fully replaces the built-in
   * evaluators — neither the safe interpreter nor `new Function` is used. Plug
   * in your own hardened/sandboxed expression engine here.
   */
  conditionEvaluator?: ConditionEvaluator
  /**
   * Opt in to evaluating `condition` expressions as full, UNSANDBOXED JavaScript
   * via `new Function`. SECURITY: only enable for workflow definitions authored by
   * TRUSTED developers/admins — never end-user input. Ignored when
   * `conditionEvaluator` is supplied. Defaults to `false`, i.e. the safe,
   * non-`new Function` interpreter ({@link safeEvaluateCondition}) is used.
   */
  allowUnsafeConditionEval?: boolean
}
```

#### `HttpStep`

A step that performs an outbound HTTP request via the swappable
`@molecule/api-http` core (never a hardcoded fetch/axios). `${$.path}`
templates in `url`, `headers`, `params`, and `body` are resolved against
context before the request is sent.

```typescript
interface HttpStep {
  type: 'http'
  /** Request URL (supports `${$.path}` templates). */
  url: string
  /** HTTP method; defaults to `GET`. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  /** Request headers (values support `${$.path}` templates). */
  headers?: Record<string, string>
  /** Query parameters (values support `${$.path}` templates). */
  params?: Record<string, string | number | boolean | undefined>
  /** Request body — objects are JSON-encoded by the http core (supports templates). */
  body?: unknown
  /** Where to write `{ status, statusText, headers, data }` into the context. */
  output?: string
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

#### `ConditionEvaluator`

Signature for a pluggable condition evaluator. Return `true` to let the run
continue past the `condition` step, `false` to short-circuit it.

```typescript
type ConditionEvaluator = (expression: string, context: Record<string, unknown>) => boolean
```

#### `WorkflowStep`

Discriminated union of all step types that a workflow definition may contain.

```typescript
type WorkflowStep = ConditionStep | ActionStep | DelayStep | AIPromptStep | HttpStep
```

#### `WorkflowStepType`

Union of all supported step type discriminants.

```typescript
type WorkflowStepType = 'condition' | 'action' | 'delay' | 'http' | 'ai_prompt'
```

### Functions

#### `createWorkflowEngine(opts)`

Creates a `WorkflowEngine` instance wired with the provided trigger and action handlers.

```typescript
function createWorkflowEngine(opts: EngineOptions): WorkflowEngine
```

#### `safeEvaluateCondition(expression, context)`

Safely evaluates a workflow condition expression WITHOUT `new Function`/`eval`.

Supports member access against the context (`$.a.b`, `$.list[0]`), comparisons,
boolean logic, unary `!`/`-`, grouping, and literals. Function calls,
assignments, and arbitrary JavaScript are unsupported — such an expression is
unparseable and evaluates to `false` rather than executing. An unparseable or
throwing expression counts as a non-matching condition.

```typescript
function safeEvaluateCondition(expression: string, context: Record<string, unknown>): boolean
```

- `expression` — The condition expression to evaluate.
- `context` — The workflow context (bound to `$`).

**Returns:** `true` if the expression is truthy, otherwise `false`.

#### `unsafeEvaluateCondition(expression, context)`

UNSAFE: evaluates a workflow condition expression as full, unsandboxed
JavaScript via `new Function`. This is arbitrary code execution in the API
process — only run expressions authored by TRUSTED developers/admins, NEVER
end-user input. Opt in explicitly via `EngineOptions.allowUnsafeConditionEval`;
it is never the default. A throwing or unparseable expression counts as `false`.

```typescript
function unsafeEvaluateCondition(expression: string, context: Record<string, unknown>): boolean
```

- `expression` — The condition expression to evaluate as JavaScript.
- `context` — The workflow context (bound to `$`).

**Returns:** `true` if the expression is truthy, otherwise `false`.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-http` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-http`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`

SECURITY — `condition` step evaluation is SAFE BY DEFAULT. Expressions are run
through a small built-in interpreter ({@link safeEvaluateCondition}) that
supports member access, comparisons, boolean logic and literals but does NOT
use `new Function`/`eval`, cannot call functions or assign, and blocks
`__proto__`/`constructor`/`prototype` — so a malicious expression cannot
execute arbitrary code. Full unsandboxed JavaScript (`new Function`) is
OPT-IN only via `EngineOptions.allowUnsafeConditionEval: true` — enable it
ONLY for workflow definitions authored by TRUSTED developers/admins, never
from end-user input. You may also supply your own `EngineOptions.conditionEvaluator`
(e.g. a hardened sandbox), which replaces both built-ins. An expression that
throws or fails to parse counts as `false` — the run short-circuits with
`ok: true` (a skipped run, not a failure).

`'http'` steps ARE executed: the request is sent through the swappable
`@molecule/api-http` core (bond `@molecule/api-http-axios` etc. to change the
client — the engine hardcodes no HTTP library). `${$.path}` templates in
`url`/`headers`/`params`/`body` are resolved against context, the
`{ status, statusText, headers, data }` response is written to `output`, and a
trace entry is recorded. A non-2xx response (the http core throws an
`HttpError`) yields an `errored` trace entry and halts the run — never a
silent skip. Registering an `http.*` action still works too, if you want a
fully custom HTTP path. SSRF caution: validate any user-influenced `url`.

Only `ai_prompt` steps need a bonded `ai` provider (`@molecule/api-ai`);
with none bonded that step errors and the run returns `ok: false` with the
error on its trace entry. All other step types run without any AI provider.
