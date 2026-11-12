import { describe, expect, it } from 'vitest'

import { nativeFeedbackFailures } from '../playwright-feedback-reporter.js'

const source = ['/app/src/pages/Account.tsx']
const event = (error: string) =>
  JSON.stringify({
    spec: '/app/e2e/account.spec.ts',
    line: 60,
    error,
    rendered: '- textbox "Email"\n- button "Save account"',
  }) + '\n'

describe('native operation timeouts before the test budget expires', () => {
  it.each(['page.waitForURL', 'page.goto', 'page.waitForNavigation'])(
    'delivers %s without inventing a locator',
    (operation) => {
      const error = `TimeoutError: ${operation}: Timeout 10000ms exceeded.\nwaiting for navigation until "load"`
      expect(nativeFeedbackFailures(event(error), source)).toEqual([
        {
          spec: '/app/e2e/account.spec.ts',
          line: 60,
          error,
          locator: operation,
          rendered: '- textbox "Email"\n- button "Save account"',
          sourceFiles: source,
        },
      ])
    },
  )

  it.each([
    'Error: page.close: Target page, context or browser has been closed',
    'Error: Cannot find module ./missing.js',
    'TimeoutError: connection to the test server timed out',
  ])('reports the native test error without inventing a locator: %s', (error) => {
    expect(nativeFeedbackFailures(event(error), source)).toMatchObject([{ error, locator: error }])
  })
})
