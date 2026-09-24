/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The ClassMap is wired by `setup.ts`.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'

import { type Layer, LayerPanel } from '../index.js'

const initial: Layer[] = [
  { id: 'bg', name: 'Background', visible: true, locked: false },
  { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered editor layer panel.
 */
function Editor(): React.JSX.Element {
  const [layers, setLayers] = useState<Layer[]>(initial)
  const [activeId, setActiveId] = useState<string | undefined>()
  return (
    <LayerPanel
      layers={layers}
      activeId={activeId}
      onReorder={setLayers}
      onVisibilityToggle={(id) =>
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
      }
      onLockToggle={(id) =>
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
      }
      onSelect={setActiveId}
      onRename={(id, name) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))}
    />
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the layers and applies select, visibility, lock and rename back into state', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <Editor />
      </I18nProvider>,
    )
    const options = view.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Background'),
      expect.stringContaining('Sketch'),
    ])
    expect(view.getByText('80%')).toBeTruthy()

    fireEvent.click(view.getByText('Sketch'))
    expect(view.getAllByRole('option')[1]?.getAttribute('aria-selected')).toBe('true')

    const bgRow = view.getAllByRole('option')[0]
    if (!bgRow) throw new Error('missing background row')
    fireEvent.click(bgRow.querySelector('[data-mol-id="layer-panel-visibility-bg"]') as Element)
    expect(
      view.container
        .querySelector('[data-mol-id="layer-panel-visibility-bg"]')
        ?.getAttribute('aria-label'),
    ).toBe('Show layer')

    fireEvent.doubleClick(view.getByText('Sketch'))
    const input = view.getByLabelText('Rename layer')
    fireEvent.change(input, { target: { value: 'Inks' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(view.getByText('Inks')).toBeTruthy()
    expect(view.queryByText('Sketch')).toBeNull()

    fireEvent.click(view.container.querySelector('[data-mol-id="layer-panel-lock-fg"]') as Element)
    expect(
      view.container
        .querySelector('[data-mol-id="layer-panel-lock-fg"]')
        ?.getAttribute('aria-label'),
    ).toBe('Unlock layer')
  })
})
