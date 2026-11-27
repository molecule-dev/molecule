// Form shows what the server said when a request is refused. The transport's own message is a status line written
// for logs, which a user who typed a wrong password must never see as the only feedback (harness smoke run, 2026-11-27).
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '@molecule/app-http'

import { formSubmitErrorMessages } from '../utilities/form-submit-error.js'

/** The real HTTP client's rejection for a refused request. */
const refused = async (
  status: number,
  body: string,
  type = 'application/json',
): Promise<unknown> => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })),
  )
  return createFetchClient({ baseURL: 'https://accounts.example/api' })
    .post('/users/log-in', {})
    .then(
      () => {
        throw new Error('expected a refusal')
      },
      (error: unknown) => error,
    )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('formSubmitErrorMessages with a real HTTP failure', () => {
  it("shows a refused request's { error } sentence, not the transport's status line", async () => {
    const failure = await refused(
      401,
      JSON.stringify({ error: 'Invalid credentials.', errorKey: 'user.error.invalidCredentials' }),
    )
    expect(formSubmitErrorMessages(failure, 'Unable to submit.')).toEqual(['Invalid credentials.'])
  })

  it('uses the fallback for a refusal whose body has no message', async () => {
    const failure = await refused(400, '<html>Bad request</html>', 'text/html')
    expect(formSubmitErrorMessages(failure, 'Unable to submit.')).toEqual(['Unable to submit.'])
  })

  it("keeps a plain Error's own message", () => {
    expect(
      formSubmitErrorMessages(new Error('Passwords do not match.'), 'Unable to submit.'),
    ).toEqual(['Passwords do not match.'])
  })
})
