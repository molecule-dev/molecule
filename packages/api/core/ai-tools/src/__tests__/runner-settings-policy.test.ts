import { describe, expect, it } from 'vitest'

import { streamingBackgroundCommand } from '../utilities.js'

describe('native runner settings', () => {
  it.each([
    'BASE_URL=http://127.0.0.1:4607 npx playwright test',
    'BASE_URL=https://pantry.example.org npx playwright test e2e/pantry.spec.ts',
    'npx playwright test --config pantry.config.ts',
  ])('preserves configured retries in %s', (command) => {
    const prepared = streamingBackgroundCommand(command)
    expect(prepared.error).toBeUndefined()
    expect(prepared.command).not.toMatch(/--retries/)
  })

  it('preserves an explicit retry count', () => {
    const prepared = streamingBackgroundCommand(
      'BASE_URL=http://127.0.0.1:4607 npx playwright test --retries=3',
    )
    expect(prepared.command).toContain('--retries=3')
    expect(prepared.command).not.toContain('--retries=0')
  })
})
