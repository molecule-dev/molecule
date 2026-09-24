// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EmbedSnippet, type EmbedSnippetValues } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered share panel.
 */
function ShareWidgetPanel(): React.JSX.Element {
  const widgetUrl = 'https://widgets.example.com/chat/acme'
  const [values, setValues] = useState<EmbedSnippetValues>({
    width: 400,
    height: 600,
    theme: 'light',
  })
  return (
    <EmbedSnippet
      template={`<iframe src="${widgetUrl}?theme={{theme}}" style="width:{{width}};height:{{height}};border:0"></iframe>`}
      controls={{ width: true, height: true, theme: true }}
      values={values}
      onChange={setValues}
      language="iframe"
      onCopy={(code) => console.info('embed code copied', code.length)}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the substituted snippet, re-renders on control changes and copies it', async () => {
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ShareWidgetPanel />
      </I18nProvider>,
    )
    const code = (): string => view.container.querySelector('pre code')?.textContent ?? ''
    expect(view.getByRole('region', { name: 'Embed code (iframe)' })).toBeTruthy()
    expect(code()).toBe(
      '<iframe src="https://widgets.example.com/chat/acme?theme=light" style="width:400px;height:600px;border:0"></iframe>',
    )

    fireEvent.change(view.getByLabelText('Width'), { target: { value: '100%' } })
    fireEvent.change(view.getByLabelText('Theme'), { target: { value: 'dark' } })
    expect(code()).toBe(
      '<iframe src="https://widgets.example.com/chat/acme?theme=dark" style="width:100%;height:600px;border:0"></iframe>',
    )

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Copy' }))
    })
    expect(writeText).toHaveBeenCalledWith(code())
    await waitFor(() => expect(view.getByRole('button', { name: 'Copied!' })).toBeTruthy())
    expect(info).toHaveBeenCalledWith('embed code copied', code().length)
  })
})
