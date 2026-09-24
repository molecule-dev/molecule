// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileCard, type FileSummary } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered attachments list.
 */
function AttachmentsList(): React.JSX.Element {
  const cm = getClassMap()
  const files: FileSummary[] = [
    {
      id: 'f-1',
      name: 'Q3-report.pdf',
      size: 482_137,
      kind: 'document',
      modifiedAt: '2026-04-30T18:23:00Z',
    },
    { id: 'f-2', name: 'Designs', size: 0, kind: 'folder' },
  ]
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <div>
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          layout="row"
          selected={file.id === selectedId}
          className={file.id === selectedId ? cm.surfaceSecondary : undefined}
          onClick={(f) => setSelectedId(f.id)}
          actions={
            file.kind === 'folder' ? undefined : (
              <a href={`/files/${file.id}/download`} download>
                Download
              </a>
            )
          }
        />
      ))}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders sized/dated rows, selects on click and ignores clicks in actions', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-02T18:23:00Z'))
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <AttachmentsList />
      </I18nProvider>,
    )
    const report = view.getByRole('button', { name: 'Q3-report.pdf, Document file' })
    const folder = view.getByRole('button', { name: 'Designs, Folder' })
    expect(report.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 KB')
    expect(report.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      '2 days ago',
    )
    expect(folder.querySelector('[data-mol-id="file-card-size"]')).toBeNull()
    expect(folder.querySelector('a')).toBeNull()

    fireEvent.click(view.getByRole('link', { name: 'Download' }))
    expect(report.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(report)
    expect(report.getAttribute('aria-pressed')).toBe('true')
    expect(report.className).toContain(classMap.surfaceSecondary)
    expect(folder.getAttribute('aria-pressed')).toBe('false')
    expect(view.getByRole('link', { name: 'Download' }).getAttribute('href')).toBe(
      '/files/f-1/download',
    )
  })
})
