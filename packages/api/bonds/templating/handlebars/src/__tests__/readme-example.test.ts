/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real Handlebars, no mocks.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import {
  compile,
  registerPartial,
  render,
  renderCompiled,
  setProvider,
} from '@molecule/api-templating'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('escapes one-off renders and renders a compiled template with helpers and partials', async () => {
    setProvider(
      createProvider({
        helpers: { money: (cents: unknown) => `$${(Number(cents) / 100).toFixed(2)}` },
      }),
    )
    registerPartial('footer', '<p>Questions? Reply to this email.</p>')

    const greeting = await render('<h1>Hi {{name}}</h1>', { name: 'Ada <3' })

    const receipt = await compile(
      '<p>Order {{orderId}}: {{#each items}}{{name}} ({{money priceCents}}) {{/each}}</p>{{> footer}}',
    )
    const html = await renderCompiled(receipt, {
      orderId: 'A-1001',
      items: [
        { name: 'Mug', priceCents: 1200 },
        { name: 'Tee', priceCents: 2500 },
      ],
    })

    expect(greeting).toBe('<h1>Hi Ada &lt;3</h1>')
    expect(html).toBe(
      '<p>Order A-1001: Mug ($12.00) Tee ($25.00) </p><p>Questions? Reply to this email.</p>',
    )
  })

  it('backs the remarks: missing values are empty and unknown partials throw', async () => {
    setProvider(createProvider())
    expect(await render('Hi {{usernmae}}!', { username: 'Ada' })).toBe('Hi !')
    await expect(render('{{> nope}}', {})).rejects.toThrow(/nope/)
  })
})
