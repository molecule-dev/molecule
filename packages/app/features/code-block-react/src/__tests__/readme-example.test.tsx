// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CodeBlock } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered install snippet.
 */
function InstallSnippet(): React.JSX.Element {
  const code = ['npm install @molecule/app-code-block-react', 'npm run dev'].join('\n')
  return <CodeBlock code={code} language="bash" filename="terminal" showLineNumbers />
}

const i18n = createSimpleI18nProvider('en')

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the header, numbered lines and a Copy button', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={i18n}>
        <InstallSnippet />
      </I18nProvider>,
    )
    expect(html).toContain('terminal')
    expect(html).toContain('bash')
    expect(html).toContain('>Copy</button>')
    expect(html).toContain('>1</span>npm install @molecule/app-code-block-react')
    expect(html).toContain('>2</span>npm run dev')
  })

  it('copies the code to the clipboard and confirms', async () => {
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const view = render(
      <I18nProvider provider={i18n}>
        <InstallSnippet />
      </I18nProvider>,
    )
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Copy' }))
    })
    expect(writeText).toHaveBeenCalledWith(
      'npm install @molecule/app-code-block-react\nnpm run dev',
    )
    expect(view.getByRole('button', { name: 'Copied!' })).toBeTruthy()
  })
})
