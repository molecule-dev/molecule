import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Run the owning source in a child so unhandled rejections become assertion data. */
const moduleUrl = (source: string): string =>
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`

describe('optimistic value observer failures', () => {
  it.each(['pending', 'idle', 'onError'] as const)(
    'reports a throwing %s callback without breaking saves or settlement',
    (phase) => {
      const logger = moduleUrl('export const getLogger = () => globalThis.observerLogger')
      const utilities = moduleUrl(readFileSync(new URL('../utilities.ts', import.meta.url), 'utf8'))
      const controller = moduleUrl(
        readFileSync(new URL('../optimistic.ts', import.meta.url), 'utf8')
          .replace("'@molecule/app-logger'", JSON.stringify(logger))
          .replace("'./utilities.js'", JSON.stringify(utilities)),
      )
      const output = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
        const unhandled = []
        const synchronousErrors = []
        const logged = []
        process.on('unhandledRejection', (error) => unhandled.push(error.message))
        globalThis.observerLogger = {
          debug() {},
          error(message, details) { logged.push(details.error.message) },
        }
        const { createOptimisticValue } = await import(${JSON.stringify(controller)})
        const phase = ${JSON.stringify(phase)}
        const callbackFailure = new Error('observer failed')
        const value = createOptimisticValue({
          value: 1,
          commit: async (next) => {
            if (phase === 'onError' && next === 2) throw new Error('save failed')
            return next
          },
          onError() { throw callbackFailure },
        })
        let threw = false
        const notifications = []
        value.subscribe((state) => {
          if (!threw && ((phase === 'pending' && state.pending) ||
              (phase === 'idle' && !state.pending))) {
            threw = true
            throw callbackFailure
          }
        })
        value.subscribe((state) => notifications.push([state.value, state.pending]))
        try { value.set(2) } catch (error) { synchronousErrors.push(error.message) }
        let settled = false
        void value.settled().then(() => { settled = true })
        await new Promise((resolve) => setImmediate(resolve))
        const first = { ...value.getState(), error: value.getState().error?.message ?? null }
        const firstSettled = settled
        const firstNotifications = [...notifications]
        value.set(3)
        await new Promise((resolve) => setImmediate(resolve))
        console.log(JSON.stringify({
          unhandled, synchronousErrors, logged, firstSettled, firstNotifications,
          first, last: value.getState(),
        }))
      `,
        ],
        { encoding: 'utf8', timeout: 10000 },
      )
      const receipt = JSON.parse(output) as {
        unhandled: string[]
        synchronousErrors: string[]
        logged: string[]
        firstSettled: boolean
        firstNotifications: Array<[number, boolean]>
        first: { value: number; pending: boolean; error: string | null }
        last: { value: number; pending: boolean; error: null }
      }
      expect(receipt.synchronousErrors).toEqual([])
      expect(receipt.unhandled).toEqual([])
      expect(receipt.logged).toEqual(['observer failed'])
      expect(receipt.firstSettled).toBe(true)
      expect(receipt.firstNotifications).toEqual([
        [2, true],
        [phase === 'onError' ? 1 : 2, false],
      ])
      expect(receipt.first).toEqual({
        value: phase === 'onError' ? 1 : 2,
        pending: false,
        error: phase === 'onError' ? 'save failed' : null,
      })
      expect(receipt.last).toEqual({ value: 3, pending: false, error: null })
    },
  )
})
