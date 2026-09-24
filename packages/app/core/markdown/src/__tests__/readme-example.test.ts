/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `marked` bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-markdown-marked'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('renders sanitized HTML and a table of contents through the bonded provider', () => {
    setProvider(provider)

    const reply =
      '## Getting started\n\nRead the [docs](https://example.com/docs).\n\n<img src=x onerror=alert(1)>'
    const { html, toc } = requireProvider().render(reply, { linkTarget: '_blank' })

    expect(html).toBe(
      '<h2 id="getting-started">Getting started</h2>\n' +
        '<p>Read the <a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">docs</a>.</p>\n' +
        '&lt;img src=x onerror=alert(1)&gt;',
    )
    expect(html).not.toContain('<img')
    expect(toc).toEqual([{ id: 'getting-started', text: 'Getting started', level: 2 }])
  })
})
