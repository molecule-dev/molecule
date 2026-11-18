// @vitest-environment jsdom

/**
 * The AccountSection unit tests, ported from
 * `@molecule/app-settings-panel-react/src/__tests__/AccountSection.integration.test.tsx`:
 * the same behavioral assertions, mounted through the Svelte binding's own
 * composition root (`setMoleculeContext`) with the real auth client.
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { Component } from 'svelte'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  type AuthProfileConstraint,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import type { HandleUser } from './account-types.js'
import ContactHost from './ContactHost.svelte'
import { fakeHttpClient } from './http-client.js'
import TestHost from './TestHost.svelte'

const { client: http, ...httpMock } = fakeHttpClient()

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

const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []
function render(component: Component, props: Record<string, unknown>): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(component, { target: container, props }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
}
const control = (label: string): HTMLInputElement => {
  const byAria = document.querySelector(`[aria-label="${label}"]`)
  if (byAria instanceof HTMLInputElement) return byAria
  const labels = [...document.querySelectorAll('label')]
  const match = labels.find((labelEl) => labelEl.textContent?.trim() === label)
  const id = match?.getAttribute('for')
  if (!id) throw new Error(`no labeled control "${label}"`)
  return document.getElementById(id) as HTMLInputElement
}
const typed = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const blurred = (input: HTMLInputElement): void => {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}
const clicked = (element: Element): void => {
  ;(element as HTMLElement).click()
  flushSync()
}
/** Flushes pending Svelte work before each poll of the assertion. */
const waitFor = (assertion: () => void): Promise<void> =>
  vi.waitFor(() => {
    flushSync()
    assertion()
  })

const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const second = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }

beforeEach(() => {
  httpMock.get.mockReset()
  httpMock.patch.mockReset()
  httpMock.get.mockReturnValue(new Promise(() => {}))
  setI18nProvider(createSimpleI18nProvider())
})
afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  // Give the binding's same-turn handoff lane its disarm turn before the next test mounts.
  await new Promise((resolve) => setTimeout(resolve, 0))
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  setI18nProvider(createSimpleI18nProvider())
})

describe('AccountSection actual caller', () => {
  it('keeps a dirty name while a same-account background read refreshes pristine email', async () => {
    const client = clientFor<UserProfile>(first)
    render(TestHost, { client, http })
    typed(control('Name'), 'Typed name')
    client.setUser({ ...first, name: 'Server name', email: 'fresh@example.test' })
    await waitFor(() => expect(control('Email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
  })

  it('resets controls when the authenticated account changes', async () => {
    const client = clientFor<UserProfile>(first)
    render(TestHost, { client, http })
    expect(control('Name').value).toBe('Alice')
    client.setSession({ accessToken: token, user: second })
    await waitFor(() => expect(control('Name').value).toBe('Bob'))
    expect(control('Email').value).toBe('bob@example.test')
  })

  it('submits only the changed field through the configured bonded profile transport on blur', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    render(TestHost, { client, http })
    typed(control('Name'), 'Alice edited')
    blurred(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice edited' }))
    expect(httpMock.patch).not.toHaveBeenCalled()
    expect(control('Name').value).toBe('Alice edited')
  })

  it('saves a changed name for a name-only account that has no email', async () => {
    const client = clientFor<UserProfile>({ id: 'phone-account', name: 'Pat' })
    const update = publishUpdates(client)
    render(TestHost, { client, http })
    expect(control('Email').value).toBe('')
    typed(control('Name'), 'Pat renamed')
    blurred(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Pat renamed' }))
    expect(client.getUser()).toEqual({ id: 'phone-account', name: 'Pat renamed' })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('refuses a malformed non-empty email with a field error, then saves the corrected one', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    render(TestHost, { client, http })
    typed(control('Email'), 'not-an-email')
    blurred(control('Email'))
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Invalid email address'),
    )
    expect(control('Email').getAttribute('aria-invalid')).toBe('true')
    expect(update).not.toHaveBeenCalled()

    typed(control('Email'), 'alice@new.example.test')
    blurred(control('Email'))
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
    render(TestHost, { client, http })
    typed(control('Email'), 'not-an-email')
    blurred(control('Email'))
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe('Adresse e-mail invalide'),
    )
    expect(update).not.toHaveBeenCalled()
  })

  it('never sends a blank email: clearing it keeps the stored address while the name saves', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    render(TestHost, { client, http })
    typed(control('Email'), '')
    typed(control('Name'), 'Alice cleared')
    blurred(control('Name'))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Alice cleared' }))
    expect(update).toHaveBeenCalledTimes(1)
    expect(client.getUser()?.email).toBe('alice@example.test')
  })
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
    render(ContactHost, { client })
    typed(control('Display name'), '')
    typed(control('Avatar URL'), '')
    clicked(
      [...document.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Save contact',
      )!,
    )
    await waitFor(() => expect(update).toHaveBeenCalledWith({ displayName: null, avatarUrl: null }))
    client.setSession({
      accessToken: token,
      user: {
        handle: 'robert',
        email: 'robert@example.test',
        displayName: 'Robert',
        avatarUrl: null,
      },
    })
    await waitFor(() => expect(control('Display name').value).toBe('Robert'))
    expect(control('Avatar URL').value).toBe('')
    expect(document.querySelector('[aria-label="Contact client"]')?.textContent).toBe('robert')
  })

  it('keeps a non-profile newsletter form local and does not call profile transport', async () => {
    const client = clientFor<UserProfile>(first)
    const update = publishUpdates(client)
    render(ContactHost, { client })
    clicked(document.querySelector('[aria-label="Weekly digest"]')!)
    clicked(
      [...document.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Save newsletter',
      )!,
    )
    expect(document.querySelector('[aria-label="Newsletter state"]')?.textContent).toBe('true')
    expect(update).not.toHaveBeenCalled()
    expect(httpMock.patch).not.toHaveBeenCalled()
  })
})
