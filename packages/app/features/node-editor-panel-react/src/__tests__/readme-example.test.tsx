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

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  NodeEditorPanel,
  NodeEditorRadioGroup,
  NodeEditorSection,
  NodeEditorSlider,
  NodeEditorToggle,
} from '../index.js'

type ResponseFormat = 'conversational' | 'structured'

/**
 * The README example, verbatim.
 *
 * @returns The rendered inspector, or null once closed.
 */
function NodeInspector(): React.JSX.Element | null {
  const [open, setOpen] = useState(true)
  const [temperature, setTemperature] = useState(0.7)
  const [kbEnabled, setKbEnabled] = useState(false)
  const [format, setFormat] = useState<ResponseFormat>('conversational')
  if (!open) return null
  return (
    <NodeEditorPanel
      title="Node Properties"
      onClose={() => setOpen(false)}
      footer={<p>{`temperature=${temperature} kb=${kbEnabled} format=${format}`}</p>}
    >
      <NodeEditorSlider
        label="Temperature"
        value={temperature}
        onChange={setTemperature}
        min={0}
        max={2}
        step={0.1}
      />
      <NodeEditorToggle
        title="Knowledge Base"
        subtitle="Answer from uploaded docs"
        icon="database"
        checked={kbEnabled}
        onChange={setKbEnabled}
      />
      <NodeEditorSection label="Response Format">
        <NodeEditorRadioGroup<ResponseFormat>
          value={format}
          onChange={setFormat}
          options={[
            { value: 'conversational', label: 'Conversational' },
            { value: 'structured', label: 'Structured' },
          ]}
        />
      </NodeEditorSection>
    </NodeEditorPanel>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('edits every control through the consumer state and closes the panel', () => {
    const view = render(<NodeInspector />)
    expect(view.getByRole('heading', { name: 'Node Properties' })).toBeTruthy()
    expect(view.getByText('temperature=0.7 kb=false format=conversational')).toBeTruthy()

    const slider = view.getByRole('slider')
    expect(slider.getAttribute('max')).toBe('2')
    fireEvent.change(slider, { target: { value: '1.3' } })

    const toggle = view.getByRole('switch', { name: 'Knowledge Base' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(view.getByText('Structured'))
    expect(view.getByText('temperature=1.3 kb=true format=structured')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Close panel' }))
    expect(view.queryByRole('heading', { name: 'Node Properties' })).toBeNull()
  })
})
