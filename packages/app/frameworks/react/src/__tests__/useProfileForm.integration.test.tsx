// @vitest-environment jsdom

import { createServer, type Server } from 'node:http'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { AuthProvider, useAuth, useProfileForm } from '@molecule/app-react'

interface Reader extends UserProfile {
  bio: string | null
  image: string | null
}
type Fields = { name: string; email: string; bio: string; image: string; password: string }
const initial: Reader = {
  id: 'reader',
  name: 'Reader',
  email: 'reader@example.test',
  bio: null,
  image: null,
}
const defaults: Fields = { name: '', email: '', bio: '', image: '', password: '' }
const valuesFor = (user: Reader): Fields => ({
  name: user.name ?? '',
  email: user.email ?? '',
  bio: user.bio ?? '',
  image: user.image ?? '',
  password: '',
})
const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')

function storage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

/** A real local HTTP boundary: writes persist independently of every React/auth cache. */
async function accountApi(): Promise<{
  baseURL: string
  server: Server
  writes: Record<string, unknown>[]
  reject: boolean
  hold: Promise<void> | null
}> {
  let persisted = { ...initial }
  const api = {
    baseURL: '',
    server: undefined as unknown as Server,
    writes: [] as Record<string, unknown>[],
    reject: false,
    hold: null as Promise<void> | null,
  }
  api.server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json')
    if (request.url !== '/account') {
      response.writeHead(404).end('{}')
      return
    }
    if (request.method === 'GET') {
      response.end(JSON.stringify({ user: persisted }))
      return
    }
    if (request.method !== 'PATCH') {
      response.writeHead(405).end('{}')
      return
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end('{}')
      return
    }
    let body = ''
    for await (const chunk of request) body += String(chunk)
    const patch = JSON.parse(body) as Record<string, unknown>
    api.writes.push(patch)
    if (api.hold) await api.hold
    if (api.reject) {
      response.writeHead(422).end(JSON.stringify({ error: 'Invalid profile' }))
      return
    }
    // Whitelisted writable profile fields, deliberately independent of the auth client.
    for (const key of ['name', 'email', 'bio', 'image'] as const) {
      if (Object.hasOwn(patch, key)) persisted = { ...persisted, [key]: patch[key] }
    }
    response.end(JSON.stringify({ user: persisted }))
  })
  await new Promise<void>((resolve) => api.server.listen(0, '127.0.0.1', resolve))
  const address = api.server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server')
  api.baseURL = `http://127.0.0.1:${address.port}`
  return api
}

const servers: Server[] = []
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
          server.closeAllConnections()
        }),
    ),
  )
})

async function setup(signedIn = true): Promise<{
  api: Awaited<ReturnType<typeof accountApi>>
  client: AuthClient<Reader>
  store: StorageAdapter
}> {
  const api = await accountApi()
  servers.push(api.server)
  const store = storage()
  const client = createJWTAuthClient<Reader>({
    storage: store,
    baseURL: api.baseURL,
    profileEndpoint: '/account',
  })
  if (signedIn) client.setSession({ accessToken: token, user: initial })
  return { api, client, store }
}

function ProfileSummary(): React.ReactElement {
  const { user } = useAuth<Reader>()
  return <output aria-label="Shared profile">{JSON.stringify(user)}</output>
}

function ProfileForm({
  onSaved,
  validate,
}: {
  onSaved?: (user: Reader) => void | Promise<void>
  validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
}): React.ReactElement {
  const form = useProfileForm<Reader, Fields>({
    defaultValues: defaults,
    getIdentity: (user) => user.id,
    toValues: valuesFor,
    toPatch: ({ password, ...changes }) => ({
      ...changes,
      ...('bio' in changes ? { bio: changes.bio?.trim() ? changes.bio : null } : {}),
      ...('image' in changes ? { image: changes.image?.trim() ? changes.image : null } : {}),
      ...(password?.trim() ? { password } : {}),
    }),
    onSaved,
    validate,
  })
  return (
    <>
      <form aria-label="Profile" {...form.formProps}>
        <input aria-label="Name" {...form.register('name')} />
        <input aria-label="Email" {...form.register('email', { email: true })} />
        {form.formState.errors.email && <p role="alert">{form.formState.errors.email}</p>}
        <textarea aria-label="Bio" {...form.register('bio')} />
        <input aria-label="Image" {...form.register('image')} />
        <input aria-label="Password" type="password" {...form.register('password')} />
        <button type="submit" disabled={!form.ready || form.isSubmitting}>
          Save
        </button>
        <button type="button" onClick={form.reset}>
          Reset
        </button>
      </form>
      <output aria-label="Form state">
        {JSON.stringify({ dirty: form.isDirty, saving: form.isSubmitting })}
      </output>
      {form.error !== undefined && <p role="alert">Save failed</p>}
      <ProfileSummary />
    </>
  )
}

/** The recorded manual effect: every new user object overwrites editable controls. */
function LegacyForm(): React.ReactElement {
  const { user } = useAuth<Reader>()
  const [bio, setBio] = useState('')
  const [image, setImage] = useState('')
  useEffect(() => {
    setBio(user?.bio ?? '')
    setImage(user?.image ?? '')
  }, [user])
  const { client } = legacyClient
  return (
    <form
      aria-label="Profile"
      onSubmit={(event) => {
        event.preventDefault()
        void client!.updateProfile({ bio: bio || null, image: image || null })
      }}
    >
      <textarea aria-label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} />
      <input aria-label="Image" value={image} onChange={(event) => setImage(event.target.value)} />
      <button type="submit">Save</button>
    </form>
  )
}
const legacyClient: { client?: AuthClient<Reader> } = {}

const control = (label: string): HTMLInputElement | HTMLTextAreaElement =>
  screen.getByLabelText(label) as HTMLInputElement
const edit = (label: string, value: string): void => {
  fireEvent.change(control(label), { target: { value } })
}
const submit = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}
const persistedUser = async (baseURL: string): Promise<Reader> => {
  const response = await fetch(`${baseURL}/account`)
  return ((await response.json()) as { user: Reader }).user
}

describe('shared profile form: rendered controls → real HTTP → persisted profile', () => {
  it('negative control reproduces null bio/image from the recorded manual hydration effect', async () => {
    const { api, client } = await setup()
    legacyClient.client = client
    render(
      <AuthProvider client={client}>
        <LegacyForm />
      </AuthProvider>,
    )
    edit('Bio', 'Typed biography')
    edit('Image', 'https://images.example.test/reader.png')
    act(() => client.setUser({ ...initial, name: 'Background refresh' }))
    expect(control('Bio').value).toBe('')
    expect(control('Image').value).toBe('')
    submit()
    await waitFor(() => expect(api.writes).toEqual([{ bio: null, image: null }]))
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: null, image: null })
  })

  it('preserves edited controls on a background user update and publishes the saved server response', async () => {
    const { api, client, store } = await setup()
    let propagated: Reader | undefined
    render(
      <AuthProvider client={client}>
        <ProfileForm
          onSaved={(saved) => {
            propagated = saved
          }}
        />
      </AuthProvider>,
    )
    edit('Bio', 'Typed biography')
    edit('Image', 'https://images.example.test/reader.png')
    act(() => client.setUser({ ...initial, name: 'Background refresh' }))
    expect(control('Name').value).toBe('Background refresh')
    expect(control('Bio').value).toBe('Typed biography')
    expect(control('Image').value).toBe('https://images.example.test/reader.png')
    submit()
    await waitFor(() => expect(propagated?.bio).toBe('Typed biography'))
    expect(api.writes).toEqual([
      { bio: 'Typed biography', image: 'https://images.example.test/reader.png' },
    ])
    const stored = await persistedUser(api.baseURL)
    expect(stored).toMatchObject({
      bio: 'Typed biography',
      image: 'https://images.example.test/reader.png',
    })
    expect(client.getUser()).toEqual(stored)
    expect(JSON.parse(screen.getByLabelText('Shared profile').textContent!)).toEqual(stored)
    expect(screen.getByLabelText('Form state').textContent).toBe('{"dirty":false,"saving":false}')
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(stored)
    cleanup()
    render(
      <AuthProvider client={reloaded}>
        <ProfileForm />
      </AuthProvider>,
    )
    expect(control('Bio').value).toBe(stored.bio)
    expect(control('Image').value).toBe(stored.image)
  })

  it('hydrates asynchronous user data, keeps earlier edits, resets to the newest baseline, and sends no empty patch', async () => {
    const { api, client } = await setup(false)
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    edit('Bio', 'Typed before hydration')
    act(() =>
      client.setSession({ accessToken: token, user: { ...initial, bio: 'Loaded biography' } }),
    )
    expect(control('Bio').value).toBe('Typed before hydration')
    expect(control('Email').value).toBe(initial.email)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(control('Bio').value).toBe('Loaded biography')
    await act(async () => submit())
    expect(api.writes).toEqual([])
    expect(screen.getByLabelText('Form state').textContent).toBe('{"dirty":false,"saving":false}')
  })

  it('retains rejected edits, omits blank optional password, and clears a submitted credential from the saved baseline', async () => {
    const { api, client } = await setup()
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    api.reject = true
    edit('Bio', 'Retry biography')
    edit('Password', '   ')
    submit()
    await screen.findByRole('alert')
    expect(api.writes).toEqual([{ bio: 'Retry biography' }])
    expect(client.getUser()).toEqual(initial)
    expect(await persistedUser(api.baseURL)).toEqual(initial)
    expect(control('Bio').value).toBe('Retry biography')
    api.reject = false
    edit('Password', 'new-private-credential')
    submit()
    await waitFor(() => expect(control('Password').value).toBe(''))
    expect(api.writes[1]).toEqual({ bio: 'Retry biography', password: 'new-private-credential' })
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: 'Retry biography' })
    expect(client.getUser()).not.toHaveProperty('password')
  })

  it('validates registered fields before making a request and preserves an explicit field clear', async () => {
    const { api, client } = await setup()
    act(() => client.setUser({ ...initial, bio: 'Biography to clear' }))
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    edit('Email', 'invalid')
    submit()
    await screen.findByRole('alert')
    expect(api.writes).toEqual([])
    edit('Email', initial.email!)
    edit('Bio', '')
    submit()
    await waitFor(() => expect(api.writes).toEqual([{ bio: null }]))
    await waitFor(() => expect(client.getUser()?.bio).toBeNull())
    expect((await persistedUser(api.baseURL)).bio).toBeNull()
    expect(control('Bio').value).toBe('')
  })

  it('captures one submit snapshot, prevents duplicate saves and keeps newer edits made during the request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    edit('Bio', 'First submitted biography')
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    edit('Bio', 'New unsaved biography')
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toEqual({ bio: 'First submitted biography' })
    await act(async () => release())
    await waitFor(() => expect(client.getUser()?.bio).toBe('First submitted biography'))
    expect(control('Bio').value).toBe('New unsaved biography')
    expect(screen.getByLabelText('Form state').textContent).toBe('{"dirty":true,"saving":false}')
    expect((await persistedUser(api.baseURL)).bio).toBe('First submitted biography')
    submit()
    await waitFor(() => expect(client.getUser()?.bio).toBe('New unsaved biography'))
    expect((await persistedUser(api.baseURL)).bio).toBe('New unsaved biography')
  })

  it('discards the previous account edits on identity change and sign-out', async () => {
    const { client } = await setup()
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    edit('Bio', 'Private unsaved edit')
    edit('Password', 'private-credential')
    act(() =>
      client.setSession({
        accessToken: token,
        user: { ...initial, id: 'other', bio: 'Other account' },
      }),
    )
    expect(control('Bio').value).toBe('Other account')
    expect(control('Password').value).toBe('')
    act(() => client.setUser(null))
    expect(control('Bio').value).toBe('')
    expect(control('Password').value).toBe('')
  })

  it('preserves explicit identity checks even without a session revision change', async () => {
    const { client } = await setup()
    render(
      <AuthProvider client={client}>
        <ProfileForm />
      </AuthProvider>,
    )
    edit('Bio', 'Private unsaved edit')
    const revision = client.getSessionRevision!()
    act(() => client.setUser({ ...initial, id: 'other', bio: 'Other profile' }))
    expect(client.getSessionRevision!()).toBe(revision)
    expect(control('Bio').value).toBe('Other profile')
  })

  it('keeps identity-based saves for custom clients without session revisions', async () => {
    const { client, api } = await setup()
    delete client.getSessionRevision
    const saved = vi.fn()
    render(
      <AuthProvider client={client}>
        <ProfileForm onSaved={saved} />
      </AuthProvider>,
    )
    edit('Bio', 'Legacy provider biography')
    submit()
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect((await persistedUser(api.baseURL)).bio).toBe('Legacy provider biography')
  })

  it('keeps saving true until propagation finishes and retries failed propagation without another request', async () => {
    const { api, client } = await setup()
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    let propagations = 0
    render(
      <AuthProvider client={client}>
        <ProfileForm
          onSaved={async () => {
            propagations++
            if (propagations === 1) {
              await pending
              throw new Error('Cache unavailable')
            }
          }}
        />
      </AuthProvider>,
    )
    edit('Bio', 'Saved biography')
    submit()
    await waitFor(() => expect(propagations).toBe(1))
    expect(screen.getByLabelText('Form state').textContent).toBe('{"dirty":false,"saving":true}')
    expect((await persistedUser(api.baseURL)).bio).toBe('Saved biography')
    await act(async () => finish())
    await screen.findByRole('alert')
    submit()
    await waitFor(() => expect(propagations).toBe(2))
    expect(api.writes).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not publish or propagate account A after switching to B during the real HTTP request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const propagated: Reader[] = []
    render(
      <AuthProvider client={client}>
        <ProfileForm
          onSaved={(user) => {
            propagated.push(user)
          }}
        />
      </AuthProvider>,
    )
    edit('Bio', 'Account A submitted biography')
    submit()
    await waitFor(() => expect(api.writes).toHaveLength(1))
    const other = { ...initial, id: 'other', name: 'Other', bio: 'Account B biography' }
    act(() => client.setSession({ accessToken: token, user: other }))
    edit('Bio', 'Account B unsaved biography')
    await act(async () => release())
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    expect(client.getUser()).toEqual(other)
    expect(control('Bio').value).toBe('Account B unsaved biography')
    expect(propagated).toEqual([])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
  })

  it.each(['account switch', 'unmount', 'client replacement'] as const)(
    'does not start a mutation after %s while asynchronous validation is pending',
    async (transition) => {
      const { api, client } = await setup()
      const mutation = vi.spyOn(client, 'updateProfile')
      const replacement = transition === 'client replacement' ? await setup() : undefined
      let finishValidation!: () => void
      const pending = new Promise<void>((resolve) => {
        finishValidation = resolve
      })
      let validationStarted = false
      const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
        validationStarted = true
        await pending
        return {}
      }
      const propagated: Reader[] = []
      const form = (
        <ProfileForm
          validate={validate}
          onSaved={(user) => {
            propagated.push(user)
          }}
        />
      )
      const view = render(<AuthProvider client={client}>{form}</AuthProvider>)
      edit('Bio', 'Account A unsaved biography')
      submit()
      await waitFor(() => expect(validationStarted).toBe(true))
      expect(api.writes).toEqual([])
      if (transition === 'account switch') {
        act(() =>
          client.setSession({
            accessToken: token,
            user: { ...initial, id: 'other', bio: 'Account B biography' },
          }),
        )
      } else if (transition === 'unmount') {
        view.unmount()
      } else {
        view.rerender(<AuthProvider client={replacement!.client}>{form}</AuthProvider>)
      }
      await act(async () => finishValidation())
      if (transition !== 'unmount') {
        await waitFor(() =>
          expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
            false,
          ),
        )
      }
      expect(api.writes).toEqual([])
      expect(replacement?.api.writes ?? []).toEqual([])
      expect(mutation).not.toHaveBeenCalled()
      expect(propagated).toEqual([])
      expect(await persistedUser(api.baseURL)).toEqual(initial)
      if (transition === 'account switch') {
        expect(client.getUser()?.id).toBe('other')
        expect(control('Bio').value).toBe('Account B biography')
      }
    },
  )

  it('keeps a validated submit when only the same account background data changes', async () => {
    const { api, client } = await setup()
    let finishValidation!: () => void
    const pending = new Promise<void>((resolve) => {
      finishValidation = resolve
    })
    let validationStarted = false
    const validate = async (): Promise<Partial<Record<keyof Fields, string>>> => {
      validationStarted = true
      await pending
      return {}
    }
    render(
      <AuthProvider client={client}>
        <ProfileForm validate={validate} />
      </AuthProvider>,
    )
    edit('Bio', 'Account A submitted biography')
    submit()
    await waitFor(() => expect(validationStarted).toBe(true))
    act(() => client.setUser({ ...initial, name: 'Background refresh' }))
    await act(async () => finishValidation())
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    expect(api.writes).toEqual([{ bio: 'Account A submitted biography' }])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
    expect(client.getUser()?.bio).toBe('Account A submitted biography')
  })
})
