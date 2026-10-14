// @vitest-environment jsdom

/**
 * The share modal hosts the app's own share sections, and can hide its links.
 *
 * A host's share dialog is more than the link: molecule.dev also controls what
 * the link exposes (build sessions, code). Those sections render inside the same
 * dialog via `children`, and `showLinks={false}` drops the link section — and its
 * list request — for a caller who may open the dialog but not list links.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

const httpMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))

vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => httpMock,
  useThemeMode: () => 'dark',
}))

import { ShareModal } from '../components/ShareModal.js'

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setI18nProvider(createSimpleI18nProvider('en'))
  httpMock.get.mockReset().mockResolvedValue({ data: { data: [] } })
})

afterEach(() => {
  cleanup()
})

describe('ShareModal — host content', () => {
  it('renders host children below the links', async () => {
    const { container } = render(
      <ShareModal projectId="p1" onClose={() => {}}>
        <div data-mol-id="host-section">extra</div>
      </ShareModal>,
    )
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="share-create"]')).not.toBeNull()
    })
    const host = container.querySelector('[data-mol-id="host-section"]')
    expect(host).not.toBeNull()
    const create = container.querySelector('[data-mol-id="share-create"]')!
    // Links first, host sections after.
    expect(create.compareDocumentPosition(host!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('showLinks={false} hides the link section and never lists links', async () => {
    const { container } = render(
      <ShareModal projectId="p1" showLinks={false} onClose={() => {}}>
        <div data-mol-id="host-section">extra</div>
      </ShareModal>,
    )
    expect(container.querySelector('[data-mol-id="host-section"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="share-create"]')).toBeNull()
    expect(container.textContent).not.toContain('Create a public link')
    await new Promise((r) => setTimeout(r, 20))
    expect(httpMock.get).not.toHaveBeenCalled()
  })
})
