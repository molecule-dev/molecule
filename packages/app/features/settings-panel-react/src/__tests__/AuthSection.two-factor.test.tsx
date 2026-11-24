// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthSection } from '../AuthSection.js'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'user-1' } }),
  useChangePassword: () => ({
    status: 'idle',
    error: null,
    changePassword: vi.fn(),
    reset: vi.fn(),
  }),
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_target, prop) => (prop === 'cn' ? () => '' : () => ''),
    }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Alert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Flex: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Input: () => <input />,
  Modal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? <div>{children}</div> : null,
}))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

// An API without a two-factor provider serves no `verify-two-factor` route, so a scaffold
// without one renders the section with `twoFactor={false}`: an Enable button there only 404s.
describe('AuthSection two-factor row', () => {
  it('shows the row and reads the 2FA status by default', async () => {
    http.get.mockResolvedValue({ data: { props: { twoFactorEnabled: true } } })
    render(<AuthSection />)
    expect(screen.getByText('Two-factor authentication')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Disable')).toBeTruthy())
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('shows only the password change when twoFactor is false', () => {
    render(<AuthSection twoFactor={false} />)
    expect(screen.getByText('Change password')).toBeTruthy()
    expect(screen.queryByText('Two-factor authentication')).toBeNull()
    expect(screen.queryByText('Enable')).toBeNull()
    expect(http.get).not.toHaveBeenCalled()
  })
})
