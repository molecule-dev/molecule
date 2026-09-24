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

import { PasswordGenerator } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered login form.
 */
function NewLoginForm(): React.JSX.Element {
  const [password, setPassword] = useState('')
  return (
    <form>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <PasswordGenerator
        defaultLength={24} // clamped to 8..64
        defaultCharset={{ noSimilar: true }} // merged over the all-on defaults
        autoCopy
        onPick={(generated) => setPassword(generated)} // fires on "Use this password" only
      />
    </form>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('generates a 24-char password, auto-copies it, and fills the field on pick', async () => {
    // The system clipboard is the outside world here.
    const writeText = vi.fn(async (_text: string) => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <NewLoginForm />
      </I18nProvider>,
    )
    await act(async () => {}) // flush the clipboard promise

    const readout = view.getByLabelText('Generated password') as HTMLInputElement
    expect(readout.value).toHaveLength(24)
    expect(readout.value).not.toMatch(/[0Oo1lI]/)
    expect(writeText).toHaveBeenLastCalledWith(readout.value)
    expect(view.getByRole('button', { name: 'Copied!' })).toBeTruthy()

    const field = view.getByLabelText('Password') as HTMLInputElement
    expect(field.value).toBe('')
    fireEvent.click(view.getByRole('button', { name: 'Use this password' }))
    expect(field.value).toBe(readout.value)

    await act(async () => {
      fireEvent.click(view.getByRole('checkbox', { name: 'Symbols (!@#…)' }))
    })
    expect(readout.value).toHaveLength(24)
    expect(readout.value).toMatch(/^[A-Za-z0-9]+$/)
    expect(field.value).not.toBe(readout.value)
  })
})
