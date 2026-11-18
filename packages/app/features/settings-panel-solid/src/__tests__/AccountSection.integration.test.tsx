// @vitest-environment jsdom

/**
 * The React package's `AccountSection.integration.test.tsx`, ported to Solid:
 * the section over the binding's real `useProfileForm` and a real JWT auth
 * client, rendered with Solid's browser renderer (the approach the UI
 * package's own tests use).
 *
 * @module
 */

import { createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  type AuthProfileConstraint,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import type * as AppSolid from '@molecule/app-solid'
import { createAuthFromClient, MoleculeProvider, useProfileForm } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AccountSection } from '../AccountSection.jsx'

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSolid>()
  return {
    ...actual,
    useHttpClient: () => http,
  }
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
function clientFor<T extends AuthProfileConstraint<T>>(user: T): AuthClient<T> {
  const client = createJWTAuthClient<T>({
    storage: storage(),
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: token, user })
  return client
}
function publishUpdates<T extends object>(client: AuthClient<T>): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    const saved = { ...client.getUser()!, ...patch }
    client.setUser(saved)
    return saved
  })
}
const field = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement
const labelled = (label: string): HTMLElement =>
  document.querySelector(`[aria-label="${label}"]`) as HTMLElement
const buttonNamed = (text: string): HTMLButtonElement =>
  Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent === text,
  ) as HTMLButtonElement
const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const second = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }

/** Let Solid's queued effects and the fetch promises flush before assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

const disposers: Array<() => void> = []
/** Render with Solid's browser renderer and dispose after each test. */
function mount(app: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
}
/** The provider stack the section needs: the real auth client under `auth`. */
function withProvider(client: AuthClient<unknown>, app: () => JSX.Element): () => JSX.Element {
  return () =>
    (
      <MoleculeProvider config={{ auth: client as AuthClient<Record<string, unknown>> }}>
        {app()}
      </MoleculeProvider>
    ) as JSX.Element
}

/** Types into a native input exactly as a user would (property first, then events). */
function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
/** Blurs a field exactly as a user would. */
function blur(input: HTMLInputElement): void {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
  http.get.mockReturnValue(new Promise(() => {}))
  setClassMap(classMap)
})
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  vi.restoreAllMocks()
  setI18nProvider(createSimpleI18nProvider())
})

describe('AccountSection actual caller', () => {
  it('keeps a dirty name while a same-account background read refreshes pristine email', async () => {
    const client = clientFor<UserProfile>(first)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    type(field('settings-name'), 'Typed name')
    client.setUser({ ...first, name: 'Server name', email: 'fresh@example.test' })
    await vi.waitFor(() => expect(field('settings-email').value).toBe('fresh@example.test'))
    expect(field('settings-name').value).toBe('Typed name')
  })

  it('resets controls when the authenticated account changes', async () => {
    const client = clientFor<UserProfile>(first)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    expect(field('settings-name').value).toBe('Alice')
    client.setSession({ accessToken: token, user: second })
    await vi.waitFor(() => expect(field('settings-name').value).toBe('Bob'))
    expect(field('settings-email').value).toBe('bob@example.test')
  })

  it('submits only the changed field through the configured bonded profile transport on blur', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    type(field('settings-name'), 'Alice edited')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice edited' }))
    expect(http.patch).not.toHaveBeenCalled()
    expect(field('settings-name').value).toBe('Alice edited')
  })

  it('saves a changed name for a name-only account that has no email', async () => {
    const client = clientFor<UserProfile>({ id: 'phone-account', name: 'Pat' })
    const update = publishUpdates(client)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    expect(field('settings-email').value).toBe('')
    type(field('settings-name'), 'Pat renamed')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Pat renamed' }))
    expect(client.getUser()).toEqual({ id: 'phone-account', name: 'Pat renamed' })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('refuses a malformed non-empty email with a field error, then saves the corrected one', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    type(field('settings-email'), 'not-an-email')
    blur(field('settings-email'))
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Invalid email address'),
    )
    expect(field('settings-email').getAttribute('aria-invalid')).toBe('true')
    expect(update).not.toHaveBeenCalled()

    type(field('settings-email'), 'alice@new.example.test')
    blur(field('settings-email'))
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ email: 'alice@new.example.test' }))
  })

  it('shows the malformed-email error in the active locale', async () => {
    setI18nProvider(
      createSimpleI18nProvider('fr', [
        {
          code: 'fr',
          name: 'Français',
          translations: { 'forms.invalidEmail': 'Adresse e-mail invalide' },
        },
      ]),
    )
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    type(field('settings-email'), 'not-an-email')
    blur(field('settings-email'))
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Adresse e-mail invalide'),
    )
    expect(update).not.toHaveBeenCalled()
  })

  it('never sends a blank email: clearing it keeps the stored address while the name saves', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    mount(withProvider(client, () => <AccountSection />))
    await settle()
    type(field('settings-email'), '')
    type(field('settings-name'), 'Alice cleared')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice cleared' }))
    expect(update).toHaveBeenCalledTimes(1)
    expect(client.getUser()?.email).toBe('alice@example.test')
  })
})

interface HandleUser {
  handle: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}
type ContactValues = { displayName: string; avatarUrl: string }
function ContactForm(props: { client: AuthClient<HandleUser> }): JSX.Element {
  const form = useProfileForm<HandleUser, ContactValues>({
    defaultValues: { displayName: '', avatarUrl: '' },
    getIdentity: (user) => user.handle,
    toValues: (user) => ({ displayName: user.displayName ?? '', avatarUrl: user.avatarUrl ?? '' }),
    toPatch: (changes) => ({
      ...('displayName' in changes ? { displayName: changes.displayName || null } : {}),
      ...('avatarUrl' in changes ? { avatarUrl: changes.avatarUrl || null } : {}),
    }),
  })
  const { user } = createAuthFromClient(props.client)
  const displayName = form.register('displayName')
  const avatarUrl = form.register('avatarUrl')
  return (
    <form aria-label="Contact" onSubmit={form.formProps.onSubmit}>
      <input
        aria-label="Display name"
        value={form.formState().values.displayName}
        name={displayName.name}
        onChange={displayName.onChange}
      />
      <input
        aria-label="Avatar URL"
        value={form.formState().values.avatarUrl}
        name={avatarUrl.name}
        onChange={avatarUrl.onChange}
      />
      <button type="submit">Save contact</button>
      <output aria-label="Contact client">{user()?.handle}</output>
    </form>
  )
}

describe('representative non-X1 custom aliases and custom-form counterexample', () => {
  it('clears nullable aliases and switches handle-keyed accounts without an id', async () => {
    const alice: HandleUser = {
      handle: 'alice',
      email: 'alice@example.test',
      displayName: 'Alice',
      avatarUrl: 'alice.png',
    }
    const client = clientFor<HandleUser>(alice)
    const update = publishUpdates(client)
    mount(withProvider(client, () => <ContactForm client={client} />))
    await settle()
    type(labelled('Display name') as HTMLInputElement, '')
    type(labelled('Avatar URL') as HTMLInputElement, '')
    buttonNamed('Save contact').click()
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith({ displayName: null, avatarUrl: null }),
    )
    client.setSession({
      accessToken: token,
      user: {
        handle: 'robert',
        email: 'robert@example.test',
        displayName: 'Robert',
        avatarUrl: null,
      },
    })
    await vi.waitFor(() =>
      expect((labelled('Display name') as HTMLInputElement).value).toBe('Robert'),
    )
    expect((labelled('Avatar URL') as HTMLInputElement).value).toBe('')
    expect(labelled('Contact client').textContent).toBe('robert')
  })

  it('keeps a non-profile newsletter form local and does not call profile transport', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    function NewsletterForm(): JSX.Element {
      const [digest, setDigest] = createSignal(false)
      const [saved, setSaved] = createSignal(false)
      return (
        <form
          aria-label="Newsletter"
          onSubmit={(event) => {
            event.preventDefault()
            setSaved(true)
          }}
        >
          <input
            aria-label="Weekly digest"
            type="checkbox"
            checked={digest()}
            onChange={(event) => setDigest((event.target as HTMLInputElement).checked)}
          />
          <button type="submit">Save newsletter</button>
          <Show when={saved()}>
            <output aria-label="Newsletter state">{String(digest())}</output>
          </Show>
        </form>
      )
    }
    mount(withProvider(client, () => <NewsletterForm />))
    await settle()
    ;(labelled('Weekly digest') as HTMLInputElement).click()
    buttonNamed('Save newsletter').click()
    expect(labelled('Newsletter state').textContent).toBe('true')
    expect(update).not.toHaveBeenCalled()
    expect(http.patch).not.toHaveBeenCalled()
  })
})
