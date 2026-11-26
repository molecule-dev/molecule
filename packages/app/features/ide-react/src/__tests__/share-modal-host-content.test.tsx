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

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type * as AppReact from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

const httpMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))

// Partial mock: the real module keeps `useTranslation` (the components read `t`
// through the hook, which resolves the bonded provider set in `beforeEach`);
// only the http/theme hooks are stood in here.
vi.mock('@molecule/app-react', async () => ({
  ...(await vi.importActual<typeof AppReact>('@molecule/app-react')),
  useHttpClient: () => httpMock,
  useThemeMode: () => 'dark',
}))

import { ReportModal } from '../components/ReportModal.js'
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

/** Exercises Escape and focus restoration while a second dialog is open. */
async function closesOnlyTopDialog(): Promise<void> {
  const onReportClose = vi.fn()
  const onShareClose = vi.fn()

  const { baseElement, rerender } = render(
    <ReportModal projectId="p1" onClose={onReportClose} onSubmitted={vi.fn()} />,
  )
  const title = baseElement.querySelector<HTMLElement>('[data-mol-id="report-title"]')
  await waitFor(() => expect(document.activeElement).toBe(title))
  title?.focus()

  /** A host that closes only the share dialog when its close callback fires. */
  function ShareOnTop(): React.JSX.Element | null {
    const [open, setOpen] = useState(true)
    return open ? (
      <ShareModal
        projectId="p1"
        showLinks={false}
        onClose={() => {
          onShareClose()
          setOpen(false)
        }}
      />
    ) : null
  }

  rerender(
    <>
      <ReportModal projectId="p1" onClose={onReportClose} onSubmitted={vi.fn()} />
      <ShareOnTop />
    </>,
  )
  const share = baseElement.querySelector('[data-mol-id="share-modal"]')
  expect(share).not.toBeNull()
  fireEvent.keyDown(share ?? document.body, { key: 'Escape' })
  expect(onShareClose).toHaveBeenCalledOnce()
  expect(onReportClose).not.toHaveBeenCalled()
  expect(baseElement.querySelector('[data-mol-id="share-modal"]')).toBeNull()
  await waitFor(() => expect(document.activeElement).toBe(title))
}

describe('ShareModal — host content', () => {
  it('renders host children below the links', async () => {
    const { baseElement: container } = render(
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
    const { baseElement: container } = render(
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

  it('closes on a backdrop click, but never on a click inside the dialog', async () => {
    const onClose = vi.fn()
    const { baseElement: container } = render(
      <ShareModal projectId="p1" showLinks={false} onClose={onClose} />,
    )
    const dialog = container.querySelector('[data-mol-id="share-modal"]') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')

    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    const backdrop = container.querySelector(
      '[role="presentation"]:has(> [data-mol-id="share-modal"])',
    ) as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()

    cleanup()
    await closesOnlyTopDialog()
  })
})
