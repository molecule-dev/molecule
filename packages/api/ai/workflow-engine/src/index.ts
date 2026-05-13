/**
 * `@molecule/api-ai-workflow-engine` — trigger / condition / action
 * workflow runner with pluggable handler registry + optional
 * AI-assisted step suggestions.
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
 *     'http.post': async ({ url, body }) => fetch(url, { method: 'POST', body: JSON.stringify(body) }),
 *     'slack.message': async ({ channel, text }) => slackClient.chat.postMessage({ channel, text }),
 *   },
 * })
 *
 * const run = await engine.execute({
 *   trigger: 'webhook.received',
 *   triggerInput: { payload: req.body },
 *   steps: [
 *     { type: 'condition', expression: '$.event === "purchase"' },
 *     { type: 'action', action: 'slack.message', params: { channel: '#sales', text: 'New sale: ${$.amount}' } },
 *   ],
 * })
 * ```
 *
 * @module
 */

import { hasProvider as hasAI, requireProvider as requireAI } from '@molecule/api-ai'

export type WorkflowStepType = 'condition' | 'action' | 'delay' | 'http' | 'ai_prompt'

export interface ConditionStep {
  type: 'condition'
  /** JS expression evaluated against `$` (the workflow context). */
  expression: string
}

export interface ActionStep {
  type: 'action'
  /** Action key registered with the engine. */
  action: string
  /** Param template — `${$.x.y}` placeholders are resolved against context. */
  params?: Record<string, unknown>
  /** Where to write the action's return value into the context. */
  output?: string
}

export interface DelayStep {
  type: 'delay'
  /** Milliseconds to sleep. */
  ms: number
}

export interface AIPromptStep {
  type: 'ai_prompt'
  prompt: string
  /** Field on context to write the model's text response. */
  output: string
}

export type WorkflowStep = ConditionStep | ActionStep | DelayStep | AIPromptStep

export interface WorkflowDefinition {
  trigger: string
  triggerInput?: Record<string, unknown>
  steps: WorkflowStep[]
}

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

export interface WorkflowEngine {
  execute(definition: WorkflowDefinition): Promise<WorkflowRun>
}

export interface EngineOptions {
  triggers: Record<string, (ctx: Record<string, unknown>) => Promise<unknown> | unknown>
  actions: Record<string, (params: Record<string, unknown>) => Promise<unknown> | unknown>
}

function evaluateExpression(expr: string, ctx: Record<string, unknown>): boolean {
  try {
    const fn = new Function('$', `return (${expr})`)
    return Boolean(fn(ctx))
  } catch {
    return false
  }
}

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

export function createWorkflowEngine(opts: EngineOptions): WorkflowEngine {
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
            const ok = evaluateExpression(step.expression, ctx)
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
          } else if (step.type === 'ai_prompt') {
            if (!hasAI()) throw new Error('No AI provider bonded — ai_prompt step requires one')
            const ai = requireAI()
            const prompt = resolveTemplates(step.prompt, ctx) as string
            let answer = ''
            for await (const event of ai.chat({
              messages: [{ role: 'user', content: prompt }],
            })) {
              const e = event as { type: string; text?: string }
              if (e.type === 'text') answer += e.text ?? ''
            }
            setContextPath(ctx, step.output, answer)
            trace.push({ index: i, type: step.type, outcome: 'executed' })
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
