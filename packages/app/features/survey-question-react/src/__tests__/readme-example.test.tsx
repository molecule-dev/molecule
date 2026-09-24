// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type SurveyAnswerValue, SurveyQuestion, type SurveyQuestionDef } from '../index.js'

const question: SurveyQuestionDef = {
  id: 'nps',
  kind: 'nps',
  prompt: 'How likely are you to recommend us to a friend?',
  required: true,
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered NPS survey.
 */
function NpsSurvey(): React.JSX.Element {
  const [answer, setAnswer] = useState<SurveyAnswerValue>()
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  /**
   * Sends the answer to the API.
   *
   * @param value - The validated answer.
   */
  function submit(value: SurveyAnswerValue): void {
    post('/survey-responses', { questionId: question.id, value }).then(
      () => setStatus('sent'),
      () => setStatus('failed'),
    )
  }
  if (status === 'sent') return <p>Thanks for your feedback!</p>
  return (
    <>
      <SurveyQuestion question={question} value={answer} onChange={setAnswer} onSubmit={submit} />
      {status === 'failed' && <p role="alert">Could not send your answer. Please try again.</p>}
    </>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderSurvey(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <NpsSurvey />
    </I18nProvider>,
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

  it('blocks an unanswered submit, then posts the picked score and thanks the user', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderSurvey()
    expect(view.getByRole('heading', { name: /How likely are you to recommend us/ })).toBeTruthy()
    expect(view.getAllByRole('radio')).toHaveLength(11)

    fireEvent.click(view.getByRole('button', { name: 'Submit' }))
    expect(view.getByRole('alert').textContent).toBe('This question requires an answer.')
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('radio', { name: '9' }))
    expect(view.getByRole('radio', { name: '9' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(view.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(view.getByText('Thanks for your feedback!')).toBeTruthy())
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/survey-responses')
    expect(JSON.parse(String(init?.body))).toEqual({ questionId: 'nps', value: 9 })
  })

  it('shows the failure message when the API rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    const view = renderSurvey()
    fireEvent.click(view.getByRole('radio', { name: '3' }))
    fireEvent.click(view.getByRole('button', { name: 'Submit' }))
    await waitFor(() =>
      expect(view.getByRole('alert').textContent).toBe(
        'Could not send your answer. Please try again.',
      ),
    )
  })
})
