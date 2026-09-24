// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CopyLinkField } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered invite panel.
 */
function InvitePanel(): React.JSX.Element {
  const inviteCode = 'abc123'
  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`
  const [copies, setCopies] = useState(0)
  return (
    <div>
      <CopyLinkField value={inviteUrl} onCopy={() => setCopies((n) => n + 1)} feedbackMs={2000} />
      <output>{copies}</output>
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows the link, copies it, confirms, and reverts after feedbackMs', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <InvitePanel />
      </I18nProvider>,
    )
    const expected = `${window.location.origin}/invite/abc123`
    expect((view.getByRole('textbox', { name: 'Link' }) as HTMLInputElement).value).toBe(expected)

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Copy' }))
    })
    expect(writeText).toHaveBeenCalledWith(expected)
    expect(view.getByRole('button', { name: 'Copied!' })).toBeTruthy()
    expect(view.container.querySelector('output')?.textContent).toBe('1')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(view.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })
})
