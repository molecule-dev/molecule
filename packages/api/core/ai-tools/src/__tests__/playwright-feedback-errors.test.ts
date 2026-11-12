import { describe, expect, it } from 'vitest'

import { nativeFeedbackFailures } from '../playwright-feedback-reporter.js'

const event = (error: string): string =>
  JSON.stringify({
    spec: '/shop/e2e/shipping.spec.ts',
    line: 14,
    error,
    rendered: '- status: Queued',
  }) + '\n'

describe('native Playwright failure evidence for any suite', () => {
  it('keeps a real test exception that has no locator', () => {
    expect(nativeFeedbackFailures(event('Error: Delivery service did not answer'), [])).toEqual([
      {
        spec: '/shop/e2e/shipping.spec.ts',
        line: 14,
        error: 'Error: Delivery service did not answer',
        locator: 'Error: Delivery service did not answer',
        rendered: '- status: Queued',
        sourceFiles: [],
      },
    ])
  })
  it('preserves the native locator, expected/received, call log, line and page snapshot', () => {
    const error = [
      'Error: expect(locator).toHaveText(expected) failed',
      "Locator: getByRole('status')",
      'Expected string: "Delivered"',
      'Received string: "Queued"',
      'Call log:',
      "  - waiting for getByRole('status')",
    ].join('\n')
    const [failure] = nativeFeedbackFailures(event(error), ['/shop/src/Shipment.svelte'])
    expect(failure).toEqual({
      spec: '/shop/e2e/shipping.spec.ts',
      line: 14,
      error,
      locator: "getByRole('status')",
      rendered: '- status: Queued',
      sourceFiles: ['/shop/src/Shipment.svelte'],
    })
  })
  it('does not turn an incomplete event or ordinary console text into test evidence', () => {
    expect(nativeFeedbackFailures('Delivery service did not answer\n', [])).toEqual([])
    expect(nativeFeedbackFailures(event('Error: failed').trim(), [])).toEqual([])
  })
})
