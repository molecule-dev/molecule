// @vitest-environment jsdom

/**
 * The shared profile form over the real auth client and a real local HTTP
 * boundary: rendered controls, hydration, save snapshot, publication and the
 * lifecycle races.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'

import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  watch,
} from 'vue'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import type { RegisterOptions } from '@molecule/app-forms'

import { useAuth } from '../composables/useAuth.js'
import { useProfileForm } from '../composables/useProfileForm.js'
import { moleculePlugin } from '../plugin.js'

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

/** A real local HTTP boundary: writes persist independently of every auth cache. */
async function accountApi(): Promise<{
  baseURL: string
  writes: Record<string, unknown>[]
  reject: boolean
  partialAnswer: boolean
  hold: Promise<void> | null
}> {
  let persisted = { ...initial }
  const api = {
    baseURL: '',
    writes: [] as Record<string, unknown>[],
    reject: false,
    partialAnswer: false,
    hold: null as Promise<void> | null,
  }
  const server = createServer(async (request, response) => {
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
    response.end(JSON.stringify(api.partialAnswer ? { props: patch } : { user: persisted }))
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP server')
  api.baseURL = `http://127.0.0.1:${address.port}`
  return api
}

const servers: Server[] = []
const wrappers: VueWrapper[] = []
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
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
  const store = storage()
  const client = createJWTAuthClient<Reader>({
    storage: store,
    baseURL: api.baseURL,
    profileEndpoint: '/account',
  })
  if (signedIn) client.setSession({ accessToken: token, user: initial })
  return { api, client, store }
}

const ProfileSummary = defineComponent({
  setup() {
    const { user } = useAuth<Reader>()
    return () => h('output', { 'aria-label': 'Shared profile' }, JSON.stringify(user.value))
  },
})

/**
 * Binds one registered control the way a template reads it: the registration's
 * handlers plus the live form state for the value.
 *
 * @param form - The profile form.
 * @param name - The field to bind.
 * @param options - Registration options (validation rules).
 * @returns The input props.
 */
function bind(
  form: ReturnType<typeof useProfileForm<Reader, Fields>>,
  name: keyof Fields,
  options?: Omit<RegisterOptions, 'name'>,
): Record<string, unknown> {
  const registration = form.register(name, options)
  return {
    name: registration.name,
    onInput: registration.onChange,
    onBlur: registration.onBlur,
    value: form.formState.value.values[name],
    ref: (element: Element | ComponentPublicInstance | null) => {
      registration.ref?.(element instanceof HTMLElement ? element : null)
    },
  }
}

const ProfileForm = defineComponent({
  props: {
    onSaved: {
      type: Function as PropType<(user: Reader) => void | Promise<void>>,
      default: undefined,
    },
    validate: {
      type: Function as PropType<
        (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
      >,
      default: undefined,
    },
  },
  setup(props) {
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
      onSaved: (user) => props.onSaved?.(user),
      validate: props.validate,
    })
    return () =>
      h('div', [
        h('form', { 'aria-label': 'Profile', onSubmit: form.formProps.onSubmit }, [
          h('input', { 'aria-label': 'Name', ...bind(form, 'name') }),
          h('input', { 'aria-label': 'Email', ...bind(form, 'email', { email: true }) }),
          form.formState.value.errors.email
            ? h('p', { role: 'alert' }, form.formState.value.errors.email)
            : null,
          h('textarea', { 'aria-label': 'Bio', ...bind(form, 'bio') }),
          h('input', { 'aria-label': 'Image', ...bind(form, 'image') }),
          h('input', { 'aria-label': 'Password', type: 'password', ...bind(form, 'password') }),
          h(
            'button',
            { type: 'submit', disabled: !form.ready.value || form.isSubmitting.value },
            'Save',
          ),
          h('button', { type: 'button', onClick: form.reset }, 'Reset'),
        ]),
        h(
          'output',
          { 'aria-label': 'Form state' },
          JSON.stringify({ dirty: form.isDirty.value, saving: form.isSubmitting.value }),
        ),
        form.error.value !== undefined ? h('p', { role: 'alert' }, 'Save failed') : null,
        h(ProfileSummary),
      ])
  },
})

/**
 * The recorded manual hydration: every new user object overwrites editable controls.
 */
const LegacyForm = defineComponent({
  setup() {
    const { user } = useAuth<Reader>()
    const bio = ref('')
    const image = ref('')
    watch(
      user,
      (current) => {
        bio.value = current?.bio ?? ''
        image.value = current?.image ?? ''
      },
      { immediate: true },
    )
    return () =>
      h(
        'form',
        {
          'aria-label': 'Profile',
          onSubmit: (event: Event) => {
            event.preventDefault()
            void legacyClient.client?.updateProfile({
              bio: bio.value || null,
              image: image.value || null,
            })
          },
        },
        [
          h('textarea', {
            'aria-label': 'Bio',
            value: bio.value,
            onInput: (event: Event) => {
              bio.value = inputValue(event)
            },
          }),
          h('input', {
            'aria-label': 'Image',
            value: image.value,
            onInput: (event: Event) => {
              image.value = inputValue(event)
            },
          }),
          h('button', { type: 'submit' }, 'Save'),
        ],
      )
  },
})
const legacyClient: { client?: AuthClient<Reader> } = {}

/**
 * Reads a control's current value.
 *
 * @param event - A DOM input event.
 * @returns The input's value.
 */
function inputValue(event: Event): string {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return ''
  return target.value
}

/**
 * Mounts one component with the auth client provided, as the plugin wires it.
 *
 * @param client - The auth client.
 * @param component - The component to mount.
 * @param props - The component's props.
 * @returns The mounted wrapper.
 */
function mountWith(
  client: AuthClient<Reader>,
  component: Component,
  props: Record<string, unknown> = {},
): VueWrapper {
  const wrapper = mount(component, {
    props,
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

const control = (wrapper: VueWrapper, label: string): HTMLInputElement | HTMLTextAreaElement =>
  wrapper.get(`[aria-label="${label}"]`).element as HTMLInputElement | HTMLTextAreaElement
const edit = async (wrapper: VueWrapper, label: string, value: string): Promise<void> => {
  await wrapper.get(`[aria-label="${label}"]`).setValue(value)
}
const submitForm = async (wrapper: VueWrapper): Promise<void> => {
  await wrapper.get('form[aria-label="Profile"]').trigger('submit')
}
const resetForm = async (wrapper: VueWrapper): Promise<void> => {
  await button(wrapper, 'Reset').trigger('click')
}

/**
 * Finds a button by its visible text.
 *
 * @param wrapper - The mounted component.
 * @param label - The button's text.
 * @returns The button.
 */
function button(wrapper: VueWrapper, label: string): DOMWrapper<Element> {
  const found = wrapper.findAll('button').find((candidate) => candidate.text() === label)
  if (!found) throw new Error(`no button labelled ${label}`)
  return found as DOMWrapper<Element>
}

/**
 * Waits for an assertion to hold, with headroom for a loaded machine.
 *
 * @param assertion - The assertion to poll.
 * @returns Resolves when the assertion passes.
 */
function waitFor(assertion: () => void): Promise<void> {
  return vi.waitFor(assertion, { timeout: 5000 })
}

const formState = (wrapper: VueWrapper): string => wrapper.get('[aria-label="Form state"]').text()
const persistedUser = async (baseURL: string): Promise<Reader> => {
  const response = await fetch(`${baseURL}/account`)
  return ((await response.json()) as { user: Reader }).user
}

describe('shared profile form: rendered controls → real HTTP → persisted profile', () => {
  it('negative control reproduces null bio/image from the recorded manual hydration effect', async () => {
    const { api, client } = await setup()
    legacyClient.client = client
    const wrapper = mountWith(client, LegacyForm)
    await edit(wrapper, 'Bio', 'Typed biography')
    await edit(wrapper, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await nextTick()
    expect(control(wrapper, 'Bio').value).toBe('')
    expect(control(wrapper, 'Image').value).toBe('')
    await submitForm(wrapper)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null, image: null }]))
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: null, image: null })
  })

  it('preserves edited controls on a background user update and publishes the saved server response', async () => {
    const { api, client, store } = await setup()
    let propagated: Reader | undefined
    let wrapper = mountWith(client, ProfileForm, {
      onSaved: (saved: Reader) => {
        propagated = saved
      },
    })
    await edit(wrapper, 'Bio', 'Typed biography')
    await edit(wrapper, 'Image', 'https://images.example.test/reader.png')
    client.setUser({ ...initial, name: 'Background refresh' })
    await nextTick()
    expect(client.getState()).toMatchObject({ authenticated: true, status: 'authenticated' })
    expect(control(wrapper, 'Name').value).toBe('Background refresh')
    expect(control(wrapper, 'Bio').value).toBe('Typed biography')
    expect(control(wrapper, 'Image').value).toBe('https://images.example.test/reader.png')
    await submitForm(wrapper)
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
    expect(JSON.parse(wrapper.get('[aria-label="Shared profile"]').text())).toEqual(stored)
    expect(formState(wrapper)).toBe('{"dirty":false,"saving":false}')
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(stored)
    wrapper.unmount()
    wrapper = mountWith(reloaded, ProfileForm)
    expect(control(wrapper, 'Bio').value).toBe(stored.bio)
    expect(control(wrapper, 'Image').value).toBe(stored.image)
  })

  it('passes the merged JWT profile to onSaved for a changed-fields HTTP answer', async () => {
    const { api, client, store } = await setup()
    api.partialAnswer = true
    const saved = vi.fn<(user: Reader) => void>()
    const wrapper = mountWith(client, ProfileForm, { onSaved: saved })
    await edit(wrapper, 'Bio', 'Only the biography changed')
    await submitForm(wrapper)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    const persisted = await persistedUser(api.baseURL)
    expect(api.writes).toEqual([{ bio: 'Only the biography changed' }])
    expect(saved.mock.calls[0]?.[0]).toEqual(persisted)
    expect(client.getUser()).toEqual(persisted)
    expect(JSON.parse(wrapper.get('[aria-label="Shared profile"]').text())).toEqual(persisted)
    expect(control(wrapper, 'Name').value).toBe(initial.name)
    const reloaded = createJWTAuthClient<Reader>({ storage: store })
    await reloaded.initialize()
    expect(reloaded.getUser()).toEqual(persisted)
  })

  it('forwards a custom provider return without inventing a profile merge in the hook', async () => {
    const { client } = await setup()
    // A deliberately raw custom provider: this violates the saved-profile contract.
    // It proves that a page callback cannot assume the composable normalized the answer.
    const raw = { bio: 'Raw custom answer' } as Reader
    vi.spyOn(client, 'updateProfile').mockResolvedValue(raw)
    const saved = vi.fn<(user: Reader) => void>()
    const wrapper = mountWith(client, ProfileForm, { onSaved: saved })
    await edit(wrapper, 'Bio', 'Submitted biography')
    await submitForm(wrapper)
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0]?.[0]).toBe(raw)
    expect(saved.mock.calls[0]?.[0]).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(initial)
  })

  it('hydrates asynchronous user data, keeps earlier edits, resets to the newest baseline, and sends no empty patch', async () => {
    const { api, client } = await setup(false)
    // Edits before the user data arrives exist only in a shell that renders before the session is
    // restored, so this case mounts the form before any session exists.
    const wrapper = mountWith(client, ProfileForm)
    expect((button(wrapper, 'Save').element as HTMLButtonElement).disabled).toBe(true)
    await edit(wrapper, 'Bio', 'Typed before hydration')
    client.setSession({ accessToken: token, user: { ...initial, bio: 'Loaded biography' } })
    await nextTick()
    expect(control(wrapper, 'Bio').value).toBe('Typed before hydration')
    expect(control(wrapper, 'Email').value).toBe(initial.email)
    await resetForm(wrapper)
    expect(control(wrapper, 'Bio').value).toBe('Loaded biography')
    await submitForm(wrapper)
    await waitFor(() => expect(formState(wrapper)).toBe('{"dirty":false,"saving":false}'))
    expect(api.writes).toEqual([])
  })

  it('retains rejected edits, omits blank optional password, and clears a submitted credential from the saved baseline', async () => {
    const { api, client } = await setup()
    const wrapper = mountWith(client, ProfileForm)
    api.reject = true
    await edit(wrapper, 'Bio', 'Retry biography')
    await edit(wrapper, 'Password', '   ')
    await submitForm(wrapper)
    await waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(api.writes).toEqual([{ bio: 'Retry biography' }])
    expect(client.getUser()).toEqual(initial)
    expect(await persistedUser(api.baseURL)).toEqual(initial)
    expect(control(wrapper, 'Bio').value).toBe('Retry biography')
    api.reject = false
    await edit(wrapper, 'Password', 'new-private-credential')
    await submitForm(wrapper)
    await waitFor(() => expect(control(wrapper, 'Password').value).toBe(''))
    expect(api.writes[1]).toEqual({
      bio: 'Retry biography',
      password: 'new-private-credential',
    })
    expect(await persistedUser(api.baseURL)).toMatchObject({ bio: 'Retry biography' })
    expect(client.getUser()).not.toHaveProperty('password')
  })

  it('validates registered fields before making a request and preserves an explicit field clear', async () => {
    const { api, client } = await setup()
    client.setUser({ ...initial, bio: 'Biography to clear' })
    const wrapper = mountWith(client, ProfileForm)
    await edit(wrapper, 'Email', 'invalid')
    await submitForm(wrapper)
    await waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(api.writes).toEqual([])
    await edit(wrapper, 'Email', initial.email ?? '')
    await edit(wrapper, 'Bio', '')
    await submitForm(wrapper)
    await waitFor(() => expect(api.writes).toEqual([{ bio: null }]))
    await waitFor(() => expect(client.getUser()?.bio).toBeNull())
    expect((await persistedUser(api.baseURL)).bio).toBeNull()
    expect(control(wrapper, 'Bio').value).toBe('')
  })

  it('captures one submit snapshot, prevents duplicate saves and keeps newer edits made during the request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const wrapper = mountWith(client, ProfileForm)
    await edit(wrapper, 'Bio', 'First submitted biography')
    await submitForm(wrapper)
    await submitForm(wrapper)
    await edit(wrapper, 'Bio', 'New unsaved biography')
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toEqual({ bio: 'First submitted biography' })
    release()
    await waitFor(() => expect(client.getUser()?.bio).toBe('First submitted biography'))
    expect(control(wrapper, 'Bio').value).toBe('New unsaved biography')
    expect(formState(wrapper)).toBe('{"dirty":true,"saving":false}')
    expect((await persistedUser(api.baseURL)).bio).toBe('First submitted biography')
    await submitForm(wrapper)
    await waitFor(() => expect(client.getUser()?.bio).toBe('New unsaved biography'))
    expect((await persistedUser(api.baseURL)).bio).toBe('New unsaved biography')
  })

  it('discards the previous account edits on identity change and sign-out', async () => {
    const { client } = await setup()
    const wrapper = mountWith(client, ProfileForm)
    await edit(wrapper, 'Bio', 'Private unsaved edit')
    await edit(wrapper, 'Password', 'private-credential')
    client.setSession({
      accessToken: token,
      user: { ...initial, id: 'other', bio: 'Other account' },
    })
    await nextTick()
    expect(control(wrapper, 'Bio').value).toBe('Other account')
    expect(control(wrapper, 'Password').value).toBe('')
    client.setUser(null)
    await nextTick()
    expect(control(wrapper, 'Bio').value).toBe('')
    expect(control(wrapper, 'Password').value).toBe('')
  })

  it('preserves explicit identity checks even without a session revision change', async () => {
    const { client } = await setup()
    const wrapper = mountWith(client, ProfileForm)
    await edit(wrapper, 'Bio', 'Private unsaved edit')
    const revision = client.getSessionRevision?.()
    client.setUser({ ...initial, id: 'other', bio: 'Other profile' })
    await nextTick()
    expect(client.getSessionRevision?.()).toBe(revision)
    expect(control(wrapper, 'Bio').value).toBe('Other profile')
  })

  it('keeps identity-based saves for custom clients without session revisions', async () => {
    const { client, api } = await setup()
    delete client.getSessionRevision
    const saved = vi.fn<(user: Reader) => void>()
    const wrapper = mountWith(client, ProfileForm, { onSaved: saved })
    await edit(wrapper, 'Bio', 'Legacy provider biography')
    await submitForm(wrapper)
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
    const wrapper = mountWith(client, ProfileForm, {
      onSaved: async () => {
        propagations++
        if (propagations === 1) {
          await pending
          throw new Error('Cache unavailable')
        }
      },
    })
    await edit(wrapper, 'Bio', 'Saved biography')
    await submitForm(wrapper)
    await waitFor(() => expect(propagations).toBe(1))
    expect(formState(wrapper)).toBe('{"dirty":false,"saving":true}')
    expect((await persistedUser(api.baseURL)).bio).toBe('Saved biography')
    finish()
    await waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    await submitForm(wrapper)
    await waitFor(() => expect(propagations).toBe(2))
    expect(api.writes).toHaveLength(1)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('does not publish or propagate account A after switching to B during the real HTTP request', async () => {
    const { api, client } = await setup()
    let release!: () => void
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const propagated: Reader[] = []
    const wrapper = mountWith(client, ProfileForm, {
      onSaved: (user: Reader) => {
        propagated.push(user)
      },
    })
    await edit(wrapper, 'Bio', 'Account A submitted biography')
    await submitForm(wrapper)
    await waitFor(() => expect(api.writes).toHaveLength(1))
    const other = { ...initial, id: 'other', name: 'Other', bio: 'Account B biography' }
    client.setSession({ accessToken: token, user: other })
    // The account switch hydrates before the person types again.
    await nextTick()
    await edit(wrapper, 'Bio', 'Account B unsaved biography')
    release()
    await waitFor(() =>
      expect((button(wrapper, 'Save').element as HTMLButtonElement).disabled).toBe(false),
    )
    expect(client.getUser()).toEqual(other)
    expect(control(wrapper, 'Bio').value).toBe('Account B unsaved biography')
    expect(propagated).toEqual([])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
  })

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
    const wrapper = mountWith(client, ProfileForm, { validate })
    await edit(wrapper, 'Bio', 'Account A submitted biography')
    await submitForm(wrapper)
    await waitFor(() => expect(validationStarted).toBe(true))
    client.setUser({ ...initial, name: 'Background refresh' })
    await nextTick()
    finishValidation()
    await waitFor(() =>
      expect((button(wrapper, 'Save').element as HTMLButtonElement).disabled).toBe(false),
    )
    expect(api.writes).toEqual([{ bio: 'Account A submitted biography' }])
    expect((await persistedUser(api.baseURL)).bio).toBe('Account A submitted biography')
    expect(client.getUser()?.bio).toBe('Account A submitted biography')
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
      const formProps = {
        validate,
        onSaved: (user: Reader) => {
          propagated.push(user)
        },
      }
      let wrapper = mountWith(client, ProfileForm, formProps)
      await edit(wrapper, 'Bio', 'Account A unsaved biography')
      await submitForm(wrapper)
      await waitFor(() => expect(validationStarted).toBe(true))
      expect(api.writes).toEqual([])
      if (transition === 'account switch') {
        client.setSession({
          accessToken: token,
          user: { ...initial, id: 'other', bio: 'Account B biography' },
        })
        await nextTick()
      } else if (transition === 'unmount') {
        wrapper.unmount()
      } else {
        // A Vue plugin's injection is fixed at mount, so replacing the client is
        // a fresh app: the old form is gone and the new one mounts signed in.
        wrapper.unmount()
        wrapper = mountWith(replacement!.client, ProfileForm, formProps)
      }
      finishValidation()
      if (transition !== 'unmount') {
        await waitFor(() =>
          expect((button(wrapper, 'Save').element as HTMLButtonElement).disabled).toBe(false),
        )
      }
      expect(api.writes).toEqual([])
      expect(replacement?.api.writes ?? []).toEqual([])
      expect(mutation).not.toHaveBeenCalled()
      expect(propagated).toEqual([])
      expect(await persistedUser(api.baseURL)).toEqual(initial)
      if (transition === 'account switch') {
        expect(client.getUser()?.id).toBe('other')
        expect(control(wrapper, 'Bio').value).toBe('Account B biography')
      }
    },
  )
})
