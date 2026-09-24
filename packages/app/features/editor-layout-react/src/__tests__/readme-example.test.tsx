// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { EditorToolbar } from '@molecule/app-editor-toolbar-react'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EditorLayout } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered post editor page.
 */
function PostEditorPage(): React.JSX.Element {
  const cm = getClassMap()
  const [body, setBody] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  return (
    <EditorLayout
      dataMolId="post-editor"
      topBar={
        <EditorToolbar
          title="Untitled post"
          className={cm.surface}
          primaryActions={[
            {
              id: 'settings',
              label: panelOpen ? 'Hide settings' : 'Show settings',
              onClick: () => setPanelOpen(!panelOpen),
            },
          ]}
        />
      }
      canvas={
        <textarea aria-label="Post body" value={body} onChange={(e) => setBody(e.target.value)} />
      }
      sidePanel={
        <section style={{ width: 320 }}>
          <h2>Post settings</h2>
        </section>
      }
      sidePanelOpen={panelOpen}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders toolbar, canvas and side panel, and toggles the panel from the toolbar', () => {
    const view = render(<PostEditorPage />)
    const root = view.container.querySelector('[data-mol-id="post-editor"]')
    expect(root).not.toBeNull()
    expect(view.getByRole('heading', { level: 1, name: 'Untitled post' })).toBeTruthy()
    expect(view.getByRole('main').querySelector('textarea')).not.toBeNull()
    expect(view.getByRole('complementary').textContent).toBe('Post settings')

    const body = view.getByLabelText('Post body') as HTMLTextAreaElement
    fireEvent.change(body, { target: { value: 'Hello world' } })
    expect(body.value).toBe('Hello world')

    fireEvent.click(view.getByRole('button', { name: 'Hide settings' }))
    expect(view.queryByRole('complementary')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Show settings' }))
    expect(view.getByRole('complementary').textContent).toBe('Post settings')
  })
})
