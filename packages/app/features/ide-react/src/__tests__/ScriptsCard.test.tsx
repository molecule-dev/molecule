// @vitest-environment jsdom

/**
 * ScriptsCard — the `/scripts` browser — must let a parameterized script collect
 * its typed options before running (SYN1-params). A plain script runs on the
 * first Run click; a script that declares params opens an inline option form on
 * Run instead, keeps Run disabled until every required option has a value, and
 * only then POSTs the run with `{ params }`.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ScriptInfo } from '../components/chat-scripts-utilities.js'
import { ScriptsCard } from '../components/ScriptsCard.js'

const PARAM_SCRIPT: ScriptInfo = {
  name: 'setup-ci',
  description: 'Add a CI/CD workflow.',
  createdAt: '',
  builtin: true,
  params: [
    {
      name: 'platform',
      type: 'enum',
      description: 'Which CI',
      required: true,
      options: ['github', 'gitlab'],
    },
  ],
}

const PLAIN_SCRIPT: ScriptInfo = {
  name: 'run-tests',
  description: 'Run tests',
  createdAt: '2026-06-01T00:00:00Z',
}

const post = vi.fn(async () => ({ data: { stdout: 'ok', stderr: '', exitCode: 0 } }))

/** An http client that lists the two scripts and records run POSTs. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async () => ({ data: { scripts: [PARAM_SCRIPT, PLAIN_SCRIPT] } })) as HttpClient['get'],
    post: post as unknown as HttpClient['post'],
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * Renders {@link ScriptsCard} inside the i18n + http providers it needs.
 *
 * @returns The render container.
 */
function renderCard(): HTMLElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </I18nProvider>
  )
  return render(wrap(<ScriptsCard projectId="p1" initialQuery="" isLight />)).container
}

/** Wait for a `data-mol-id` element to exist (querySelector alone never retries). */
async function findByMolId(container: HTMLElement, molId: string): Promise<HTMLElement> {
  return waitFor(() => {
    const el = container.querySelector(`[data-mol-id="${molId}"]`)
    expect(el, `expected [data-mol-id="${molId}"] to render`).not.toBeNull()
    return el as HTMLElement
  })
}

beforeEach(() => {
  setClassMap(classMap)
  post.mockClear()
})

afterEach(cleanup)

describe('ScriptsCard parameterized run', () => {
  it('runs a plain script immediately on Run', async () => {
    const container = renderCard()
    const runBtn = (await findByMolId(container, 'script-run-run-tests')) as HTMLButtonElement
    fireEvent.click(runBtn)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    // Ran the right endpoint with no params body.
    expect(post.mock.calls[0][0]).toContain('/scripts/run-tests/run')
    expect(post.mock.calls[0][1]).toBeUndefined()
  })

  it('opens an option form for a param script and runs with the chosen values', async () => {
    const container = renderCard()
    const runBtn = (await findByMolId(container, 'script-run-setup-ci')) as HTMLButtonElement

    // First click opens the form — it does NOT run yet.
    fireEvent.click(runBtn)
    const form = await findByMolId(container, 'script-options-setup-ci')
    expect(post).not.toHaveBeenCalled()

    // Required enum starts empty → the form's Run is disabled.
    const formRun = within(form).getByText('Run').closest('button') as HTMLButtonElement
    expect(formRun.disabled).toBe(true)

    // Choose a value, then Run posts with the params.
    const select = form.querySelector(
      '[data-mol-id="script-option-setup-ci-platform"]',
    ) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'github' } })
    expect(formRun.disabled).toBe(false)

    fireEvent.click(formRun)
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][0]).toContain('/scripts/setup-ci/run')
    expect(post.mock.calls[0][1]).toEqual({ params: { platform: 'github' } })
  })
})
