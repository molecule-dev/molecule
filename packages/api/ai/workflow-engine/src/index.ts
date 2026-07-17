/**
 * `@molecule/api-ai-workflow-engine` — trigger / condition / action
 * workflow runner with pluggable handler registry + an optional AI
 * `ai_prompt` step (send a templated prompt to the bonded AI provider
 * mid-run).
 *
 * Extracted from ai-workflow-automator flagship. Use it like an
 * embeddable Zapier engine inside your app.
 *
 * @example
 * ```ts
 * import { createWorkflowEngine } from '@molecule/api-ai-workflow-engine'
 *
 * const engine = createWorkflowEngine({
 *   triggers: {
 *     'webhook.received': async (ctx) => ctx.payload,
 *   },
 *   actions: {
 *     'slack.message': async ({ channel, text }) => slackClient.chat.postMessage({ channel, text }),
 *   },
 * })
 *
 * const run = await engine.execute({
 *   trigger: 'webhook.received',
 *   triggerInput: { payload: req.body },
 *   steps: [
 *     { type: 'condition', expression: '$.event === "purchase"' },
 *     // Native HTTP step — routed through the swappable `@molecule/api-http` core:
 *     { type: 'http', method: 'POST', url: 'https://hooks.example.com/${$.id}', body: { amount: '${$.amount}' }, output: 'webhook' },
 *     { type: 'action', action: 'slack.message', params: { channel: '#sales', text: 'New sale: ${$.amount}' } },
 *   ],
 * })
 * ```
 *
 * @remarks
 * SECURITY — `condition` step evaluation is SAFE BY DEFAULT. Expressions are run
 * through a small built-in interpreter ({@link safeEvaluateCondition}) that
 * supports member access, comparisons, boolean logic and literals but does NOT
 * use `new Function`/`eval`, cannot call functions or assign, and blocks
 * `__proto__`/`constructor`/`prototype` — so a malicious expression cannot
 * execute arbitrary code. Full unsandboxed JavaScript (`new Function`) is
 * OPT-IN only via `EngineOptions.allowUnsafeConditionEval: true` — enable it
 * ONLY for workflow definitions authored by TRUSTED developers/admins, never
 * from end-user input. You may also supply your own `EngineOptions.conditionEvaluator`
 * (e.g. a hardened sandbox), which replaces both built-ins. An expression that
 * throws or fails to parse counts as `false` — the run short-circuits with
 * `ok: true` (a skipped run, not a failure).
 *
 * `'http'` steps ARE executed: the request is sent through the swappable
 * `@molecule/api-http` core (bond `@molecule/api-http-axios` etc. to change the
 * client — the engine hardcodes no HTTP library). `${$.path}` templates in
 * `url`/`headers`/`params`/`body` are resolved against context, the
 * `{ status, statusText, headers, data }` response is written to `output`, and a
 * trace entry is recorded. A non-2xx response (the http core throws an
 * `HttpError`) yields an `errored` trace entry and halts the run — never a
 * silent skip. Registering an `http.*` action still works too, if you want a
 * fully custom HTTP path. SSRF caution: validate any user-influenced `url`.
 *
 * Only `ai_prompt` steps need a bonded `ai` provider (`@molecule/api-ai`);
 * with none bonded that step errors and the run returns `ok: false` with the
 * error on its trace entry. All other step types run without any AI provider.
 *
 * @module
 */

import { hasProvider as hasAI, requireProvider as requireAI } from '@molecule/api-ai'
import type { HttpRequestOptions } from '@molecule/api-http'
import { request as httpRequest } from '@molecule/api-http'

import {
  type ConditionEvaluator,
  safeEvaluateCondition,
  unsafeEvaluateCondition,
} from './safe-evaluator.js'

export * from './browser-guard.js'
export * from './safe-evaluator.js'

/** Union of all supported step type discriminants. */
export type WorkflowStepType = 'condition' | 'action' | 'delay' | 'http' | 'ai_prompt'

/** A step that evaluates a JS expression and short-circuits the run on false. */
export interface ConditionStep {
  type: 'condition'
  /** JS expression evaluated against `$` (the workflow context). */
  expression: string
}

/** A step that invokes a registered action handler with resolved params. */
export interface ActionStep {
  type: 'action'
  /** Action key registered with the engine. */
  action: string
  /** Param template — `${$.x.y}` placeholders are resolved against context. */
  params?: Record<string, unknown>
  /** Where to write the action's return value into the context. */
  output?: string
}

/** A step that pauses workflow execution for a fixed number of milliseconds. */
export interface DelayStep {
  type: 'delay'
  /** Milliseconds to sleep. */
  ms: number
}

/** A step that sends a prompt to the bonded AI provider and writes the response into context. */
export interface AIPromptStep {
  type: 'ai_prompt'
  prompt: string
  /** Field on context to write the model's text response. */
  output: string
}

/**
 * A step that performs an outbound HTTP request via the swappable
 * `@molecule/api-http` core (never a hardcoded fetch/axios). `${$.path}`
 * templates in `url`, `headers`, `params`, and `body` are resolved against
 * context before the request is sent.
 */
export interface HttpStep {
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

/** Discriminated union of all step types that a workflow definition may contain. */
export type WorkflowStep = ConditionStep | ActionStep | DelayStep | AIPromptStep | HttpStep

/** Describes a complete workflow: which trigger fires it and what steps to run. */
export interface WorkflowDefinition {
  trigger: string
  triggerInput?: Record<string, unknown>
  steps: WorkflowStep[]
}

/** Result returned by `WorkflowEngine.execute` — overall outcome plus per-step trace. */
export interface WorkflowRun {
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

/** Public interface for the workflow engine returned by `createWorkflowEngine`. */
export interface WorkflowEngine {
  execute(definition: WorkflowDefinition): Promise<WorkflowRun>
}

/** Configuration passed to `createWorkflowEngine` — trigger and action handler maps. */
export interface EngineOptions {
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

/** Recursively replaces `${$.path}` placeholders in strings (and nested structures) with values from context. */
function resolveTemplates(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{\$\.([^}]+)\}/g, (_, path: string) => {
      const parts = path.split('.')
      let cur: unknown = ctx
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p]
        } else return ''
      }
      return String(cur ?? '')
    })
  }
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, ctx))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = resolveTemplates(v, ctx)
    return out
  }
  return value
}

/** Writes a value into the workflow context at a dot-separated path, creating intermediate objects as needed. */
function setContextPath(ctx: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur: Record<string, unknown> = ctx
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    if (!(k in cur) || typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/** Creates a `WorkflowEngine` instance wired with the provided trigger and action handlers. */
export function createWorkflowEngine(opts: EngineOptions): WorkflowEngine {
  // Resolve the condition evaluator ONCE: an explicit custom evaluator wins;
  // otherwise `new Function` only when explicitly opted into; safe by default.
  const evaluateCondition: ConditionEvaluator =
    opts.conditionEvaluator ??
    (opts.allowUnsafeConditionEval ? unsafeEvaluateCondition : safeEvaluateCondition)

  return {
    async execute(def) {
      const triggerFn = opts.triggers[def.trigger]
      if (!triggerFn) {
        return {
          ok: false,
          context: {},
          trace: [
            {
              index: -1,
              type: 'condition',
              outcome: 'errored',
              error: `Unknown trigger: ${def.trigger}`,
            },
          ],
        }
      }

      const ctx: Record<string, unknown> = { ...(def.triggerInput ?? {}) }
      try {
        const triggerOutput = await triggerFn(ctx)
        Object.assign(ctx, triggerOutput ?? {})
      } catch (err) {
        return {
          ok: false,
          context: ctx,
          trace: [
            {
              index: -1,
              type: 'condition',
              outcome: 'errored',
              error: err instanceof Error ? err.message : String(err),
            },
          ],
        }
      }

      const trace: WorkflowRun['trace'] = []

      for (let i = 0; i < def.steps.length; i++) {
        const step = def.steps[i]
        try {
          if (step.type === 'condition') {
            const ok = evaluateCondition(step.expression, ctx)
            trace.push({ index: i, type: step.type, outcome: ok ? 'executed' : 'skipped' })
            if (!ok) return { ok: true, context: ctx, trace }
          } else if (step.type === 'delay') {
            await new Promise((r) => setTimeout(r, step.ms))
            trace.push({ index: i, type: step.type, outcome: 'executed' })
          } else if (step.type === 'action') {
            const action = opts.actions[step.action]
            if (!action) throw new Error(`Unknown action: ${step.action}`)
            const params = resolveTemplates(step.params ?? {}, ctx) as Record<string, unknown>
            const result = await action(params)
            if (step.output) setContextPath(ctx, step.output, result)
            trace.push({ index: i, type: step.type, outcome: 'executed' })
          } else if (step.type === 'http') {
            const url = resolveTemplates(step.url, ctx) as string
            const options: HttpRequestOptions = { method: step.method ?? 'GET' }
            if (step.headers) {
              options.headers = resolveTemplates(step.headers, ctx) as Record<string, string>
            }
            if (step.params) {
              options.params = resolveTemplates(step.params, ctx) as HttpRequestOptions['params']
            }
            if (step.body !== undefined) {
              options.body = resolveTemplates(step.body, ctx)
            }
            // Non-2xx responses throw an HttpError here → caught below → `errored`
            // trace entry (never a silent skip).
            const res = await httpRequest(url, options)
            if (step.output) {
              setContextPath(ctx, step.output, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers,
                data: res.data,
              })
            }
            trace.push({ index: i, type: step.type, outcome: 'executed' })
          } else if (step.type === 'ai_prompt') {
            if (!hasAI()) throw new Error('No AI provider bonded — ai_prompt step requires one')
            const ai = requireAI()
            const prompt = resolveTemplates(step.prompt, ctx) as string
            let answer = ''
            for await (const event of ai.chat({
              messages: [{ role: 'user', content: prompt }],
            })) {
              // A ChatEvent's text payload is `content` (NOT `text`, which is
              // the ContentBlock shape) — reading `event.text` did nothing.
              if (event.type === 'text') answer += event.content
            }
            setContextPath(ctx, step.output, answer)
            trace.push({ index: i, type: step.type, outcome: 'executed' })
          } else {
            // Exhaustiveness guard: every WorkflowStepType MUST have an executor.
            // `never` makes an unhandled type a compile error; the runtime throw
            // means an out-of-union step (e.g. via a cast) errors explicitly and
            // is recorded in the trace — never silently dropped.
            const unhandled: never = step
            throw new Error(`Unsupported step type: ${(unhandled as { type: string }).type}`)
          }
        } catch (err) {
          trace.push({
            index: i,
            type: step.type,
            outcome: 'errored',
            error: err instanceof Error ? err.message : String(err),
          })
          return { ok: false, context: ctx, trace }
        }
      }

      return { ok: true, context: ctx, trace }
    },
  }
}
