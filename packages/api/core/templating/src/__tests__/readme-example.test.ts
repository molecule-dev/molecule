/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Handlebars bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-templating-handlebars'

import {
  compile,
  registerHelper,
  registerPartial,
  render,
  renderCompiled,
  setProvider,
} from '../index.js'

describe('README @example', () => {
  it('renders escaped data with helpers/partials and reuses a compiled template', async () => {
    setProvider(createProvider({ escape: true }))
    registerHelper('upper', (value) => String(value).toUpperCase())
    registerPartial('footer', '<p>Sent by {{appName}}</p>')

    const html = await render('<h1>Hello {{upper name}}</h1>{{> footer}}', {
      name: '<b>ada</b>',
      appName: 'Acme',
    })
    expect(html).toBe('<h1>Hello &lt;B&gt;ADA&lt;/B&gt;</h1><p>Sent by Acme</p>')

    const greeting = await compile('Hi {{name}}, your order #{{orderId}} shipped.')
    const recipients = [
      { name: 'Ada', orderId: 1001 },
      { name: 'Grace', orderId: 1002 },
    ]
    const bodies = await Promise.all(recipients.map((r) => renderCompiled(greeting, r)))
    expect(bodies).toEqual([
      'Hi Ada, your order #1001 shipped.',
      'Hi Grace, your order #1002 shipped.',
    ])
  })
})
