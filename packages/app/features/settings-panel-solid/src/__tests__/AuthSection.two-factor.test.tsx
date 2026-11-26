// @vitest-environment jsdom

/**
 * An API without a two-factor provider serves no `verify-two-factor` route, so a scaffold without
 * one renders the section with `twoFactor={false}`: an Enable button there only answers 404.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthSection } from '../AuthSection.jsx'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: () => ({ id: 'user-1' }) }),
  useChangePassword: () => ({
    status: () => 'idle',
    error: () => null,
    changePassword: vi.fn(),
    reset: vi.fn(),
  }),
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  molIdProps: (id: string) => ({ 'data-mol-id': id }),
  getClassMap: () =>
    new Proxy({} as Record<string, unknown>, {
      get: () => () => '',
    }),
}))
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Alert: (props: { children?: JSX.Element }) => <div role="alert">{props.children}</div>,
  Button: (props: { children?: JSX.Element; onClick?: () => void }) => (
    <button type="button" onClick={() => props.onClick?.()}>
      {props.children}
    </button>
  ),
  Flex: (props: { children?: JSX.Element }) => <div>{props.children}</div>,
  Input: () => <input />,
  Modal: (props: { open: boolean; children?: JSX.Element }) => (
    <>{props.open ? <div>{props.children}</div> : null}</>
  ),
}))

const disposers: Array<() => void> = []

/**
 * Mount the section.
 *
 * @param twoFactor - The section's `twoFactor` prop, or undefined for the default.
 * @returns The container it renders into.
 */
function mount(twoFactor?: boolean): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (twoFactor === undefined ? <AuthSection /> : <AuthSection twoFactor={twoFactor} />),
    container,
  )
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.resetAllMocks()
})

describe('AuthSection two-factor row', () => {
  it('shows the row and reads the 2FA status by default', () => {
    http.get.mockReturnValue(new Promise(() => {}))
    const container = mount()
    expect(container.textContent).toContain('Two-factor authentication')
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('shows only the password change when twoFactor is false', () => {
    const container = mount(false)
    expect(container.textContent).toContain('Change password')
    expect(container.textContent).not.toContain('Two-factor authentication')
    expect(http.get).not.toHaveBeenCalled()
  })
})
