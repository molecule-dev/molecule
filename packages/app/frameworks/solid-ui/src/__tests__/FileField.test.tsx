// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { expect, it, vi } from 'vitest'

import { FileField } from '../components/FileField.jsx'

it('renders portable dimensions in pixels and applies web style overrides', () => {
  const target = document.createElement('div')
  const dispose = render(
    () => (
      <FileField
        onValueChange={vi.fn()}
        style={{ marginTop: 8, width: 64 }}
        webStyle={{ width: '50%' }}
      />
    ),
    target,
  )
  try {
    const element = target.querySelector<HTMLDivElement>('[data-mol-id="file-field"]')
    expect(element?.style.marginTop).toBe('8px')
    expect(element?.style.width).toBe('50%')
  } finally {
    dispose()
  }
})
