/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real Handlebars + real MJML, no mocks.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { render, setProvider } from '@molecule/api-templating'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('interpolates the data and compiles the MJML into an email HTML document', async () => {
    setProvider(createProvider({ validationLevel: 'strict' }))

    const html = await render(
      `<mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text font-size="20px">Welcome, {{name}}!</mj-text>
          <mj-button href="{{verifyUrl}}">Verify your email</mj-button>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>`,
      { name: 'Ada', verifyUrl: 'https://app.example.com/verify?token=abc123' },
    )

    expect(html.toLowerCase().startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('Welcome, Ada!')
    expect(html).toContain('Verify your email')
    expect(html).toContain('href="https://app.example.com/verify?token&#x3D;abc123"')
    expect(html).not.toContain('<mj-')
  })

  it('backs the remark: strict validation rejects invalid MJML', async () => {
    setProvider(createProvider({ validationLevel: 'strict' }))
    await expect(
      render('<mjml><mj-body><mj-text>Loose text</mj-text></mj-body></mjml>', {}),
    ).rejects.toThrow(/ValidationError|MJML validation errors/)
  })
})
