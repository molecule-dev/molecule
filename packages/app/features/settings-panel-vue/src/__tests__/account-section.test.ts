// @vitest-environment jsdom
/**
 * Integration tests for the Vue `AccountSection` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/AccountSection.integration.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom against a real
 * `createJWTAuthClient` (the actual caller path) plus a representative
 * non-X1 custom-identity form and the plain-form counterexample.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import {
  type AuthClient,
  type AuthProfileConstraint,
  createJWTAuthClient,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { createAuthPlugin, createHttpPlugin, useProfileForm } from '@molecule/app-vue'

import { AccountSection } from '../AccountSection.js'
import { fakeHttpClient } from './http-client.js'

const { client: httpClient, ...http } = fakeHttpClient()

interface StorageAdapterLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
const storage = (): StorageAdapterLike => {
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

const token = [btoa('{}'), btoa(JSON.stringify({ exp: 9999999999 })), 'signature'].join('.')
function clientFor<T extends AuthProfileConstraint<T>>(user: T): AuthClient<T> {
  const client = createJWTAuthClient<T>({
    storage: storage(),
    profileEndpoint: '/configured-profile',
    autoRefresh: false,
  })
  client.setSession({ accessToken: token, user })
  return client
}
function publishUpdates<T extends object>(client: AuthClient<T>): MockInstance {
  return vi.spyOn(client, 'updateProfile').mockImplementation(async (patch) => {
    const saved = { ...client.getUser()!, ...(patch as Partial<T>) }
    client.setUser(saved)
    return saved
  })
}
const control = (label: string): HTMLInputElement => {
  const byAria = document.querySelector(`[aria-label="${label}"]`)
  if (byAria) return byAria as HTMLInputElement
  const labelEl = Array.from(document.querySelectorAll('label')).find(
    (l) => l.textContent?.trim() === label,
  )
  const id = labelEl?.getAttribute('for') ?? ''
  return document.getElementById(id) as HTMLInputElement
}
/** Finds a form button by its visible text; the submit controls are not inputs. */
const controlButton = (label: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )
  if (!button) throw new Error(`no button "${label}"`)
  return button
}
const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const second = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }

const mounted: { app?: ReturnType<typeof createApp> } = {}
let sectionClient: AuthClient<object> | null = null
/**
 * Mounts a component under the auth plugin (the section's real composition)
 * with an HTTP client wired for the not-called assertions, then flushes.
 */
async function render(component: ReturnType<typeof defineComponent>): Promise<void> {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(component)
  app.use(createAuthPlugin(sectionClient ?? (clientFor(first) as AuthClient<object>)))
  app.use(createHttpPlugin(httpClient))
  mounted.app = app
  app.mount(host)
  await flush()
}
/** Mounts `AccountSection` against one client. */
async function renderAccountSection<T extends object>(client: AuthClient<T>): Promise<void> {
  sectionClient = client as AuthClient<object>
  await render(defineComponent({ render: () => h(AccountSection) }))
}
/** Drains Vue's watcher queue and a macrotask turn, like the conformance flush. */
async function flush(): Promise<void> {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
const waitFor = async (fn: () => void): Promise<void> => {
  await vi.waitFor(fn, { timeout: 2000, interval: 10 })
}
/** Types like a user: the value, then a bubbling `input` event. */
const typeLikeUser = (el: HTMLInputElement, value: string): void => {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
/** Blurs like a user: focus leaves, then a bubbling `focusout` event. */
const blurLikeUser = (el: HTMLInputElement): void => {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
  sectionClient = null
})
afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  setI18nProvider(createSimpleI18nProvider())
})

describe('AccountSection actual caller', () => {
  it('keeps a dirty name while a same-account background read refreshes pristine email', async () => {
    http.get.mockReturnValue(new Promise(() => {}))
    const client = clientFor<UserProfile>(first)
    await renderAccountSection(client)
    typeLikeUser(control('Name'), 'Typed name')
    await flush()
    client.setUser({ ...first, name: 'Server name', email: 'fresh@example.test' })
    await flush()
    await waitFor(() => expect(control('Email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
  })

  it('resets controls when the authenticated account changes', async () => {
    const client = clientFor<UserProfile>(first)
    await renderAccountSection(client)
    expect(control('Name').value).toBe('Alice')
    client.setSession({ accessToken: token, user: second })
    await flush()
    await waitFor(() => expect(control('Name').value).toBe('Bob'))
    expect(control('Email').value).toBe('bob@example.test')
  })

  it('submits only the changed field through the configured bonded profile transport on blur', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await renderAccountSection(client)
    typeLikeUser(control('Name'), 'Alice edited')
    blurLikeUser(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice edited' }))
    expect(http.patch).not.toHaveBeenCalled()
    expect(control('Name').value).toBe('Alice edited')
  })

  it('saves a changed name for a name-only account that has no email', async () => {
    const client = clientFor<UserProfile>({ id: 'phone-account', name: 'Pat' })
    const update = publishUpdates(client)
    await renderAccountSection(client)
    expect(control('Email').value).toBe('')
    typeLikeUser(control('Name'), 'Pat renamed')
    blurLikeUser(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Pat renamed' }))
    expect(client.getUser()).toEqual({ id: 'phone-account', name: 'Pat renamed' })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('refuses a malformed non-empty email with a field error, then saves the corrected one', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await renderAccountSection(client)
    typeLikeUser(control('Email'), 'not-an-email')
    blurLikeUser(control('Email'))
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Invalid email address'),
    )
    expect(control('Email').getAttribute('aria-invalid')).toBe('true')
    expect(update).not.toHaveBeenCalled()

    typeLikeUser(control('Email'), 'alice@new.example.test')
    blurLikeUser(control('Email'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ email: 'alice@new.example.test' }))
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
    await renderAccountSection(client)
    typeLikeUser(control('Email'), 'not-an-email')
    blurLikeUser(control('Email'))
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Adresse e-mail invalide'),
    )
    expect(update).not.toHaveBeenCalled()
  })

  it('never sends a blank email: clearing it keeps the stored address while the name saves', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    await renderAccountSection(client)
    typeLikeUser(control('Email'), '')
    typeLikeUser(control('Name'), 'Alice cleared')
    blurLikeUser(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice cleared' }))
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
/** A handle-keyed profile form over the same `useProfileForm` lifecycle. */
const ContactForm = defineComponent({
  props: { client: { type: Object as () => AuthClient<HandleUser>, required: true } },
  setup(props) {
    const form = useProfileForm<HandleUser, ContactValues>({
      defaultValues: { displayName: '', avatarUrl: '' },
      getIdentity: (user) => user.handle,
      toValues: (user) => ({
        displayName: user.displayName ?? '',
        avatarUrl: user.avatarUrl ?? '',
      }),
      toPatch: (changes) => ({
        ...('displayName' in changes ? { displayName: changes.displayName || null } : {}),
        ...('avatarUrl' in changes ? { avatarUrl: changes.avatarUrl || null } : {}),
      }),
    })
    return () => {
      void form.formState.value
      const displayName = form.register('displayName')
      const avatarUrl = form.register('avatarUrl')
      return h('form', { 'aria-label': 'Contact', onSubmit: form.formProps.onSubmit }, [
        h('input', {
          'aria-label': 'Display name',
          name: displayName.name,
          value: displayName.value,
          onInput: displayName.onChange,
          onBlur: displayName.onBlur,
        }),
        h('input', {
          'aria-label': 'Avatar URL',
          name: avatarUrl.name,
          value: avatarUrl.value,
          onInput: avatarUrl.onChange,
          onBlur: avatarUrl.onBlur,
        }),
        h('button', { type: 'submit' }, ['Save contact']),
        h('output', { 'aria-label': 'Contact client' }, [props.client.getUser()?.handle ?? '']),
      ])
    }
  },
})

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
    sectionClient = client as AuthClient<object>
    await render(defineComponent({ render: () => h(ContactForm, { client }) }))
    typeLikeUser(control('Display name'), '')
    typeLikeUser(control('Avatar URL'), '')
    controlButton('Save contact').click()
    await waitFor(() => expect(update).toHaveBeenCalledWith({ displayName: null, avatarUrl: null }))
    await flush()
    client.setSession({
      accessToken: token,
      user: {
        handle: 'robert',
        email: 'robert@example.test',
        displayName: 'Robert',
        avatarUrl: null,
      },
    })
    await flush()
    await waitFor(() => expect(control('Display name').value).toBe('Robert'))
    expect(control('Avatar URL').value).toBe('')
    expect(document.querySelector('[aria-label="Contact client"]')?.textContent).toBe('robert')
  })

  it('keeps a non-profile newsletter form local and does not call profile transport', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    const NewsletterForm = defineComponent({
      setup() {
        const digest = ref(false)
        const saved = ref(false)
        return () => [
          h(
            'form',
            {
              'aria-label': 'Newsletter',
              onSubmit: (event: Event) => {
                event.preventDefault()
                saved.value = true
              },
            },
            [
              h('input', {
                'aria-label': 'Weekly digest',
                type: 'checkbox',
                checked: digest.value,
                onChange: (event: Event) =>
                  (digest.value = (event.target as HTMLInputElement).checked),
              }),
              h('button', { type: 'submit' }, ['Save newsletter']),
              saved.value
                ? h('output', { 'aria-label': 'Newsletter state' }, [String(digest.value)])
                : null,
            ],
          ),
        ]
      },
    })
    await render(NewsletterForm)
    control('Weekly digest').click()
    await flush()
    controlButton('Save newsletter').click()
    await flush()
    expect(document.querySelector('[aria-label="Newsletter state"]')?.textContent).toBe('true')
    expect(update).not.toHaveBeenCalled()
    expect(http.patch).not.toHaveBeenCalled()
  })
})
