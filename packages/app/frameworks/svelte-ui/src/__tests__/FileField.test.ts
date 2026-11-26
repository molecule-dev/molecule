// @vitest-environment jsdom
import { mount, unmount } from 'svelte'
import { expect, it, vi } from 'vitest'

import FileField from '../components/FileField.svelte'

it('renders portable dimensions in pixels and applies web style overrides', async () => {
  const target = document.createElement('div')
  const instance = mount(FileField, {
    target,
    props: {
      onValueChange: vi.fn(),
      style: { marginTop: 8, width: 64 },
      webStyle: { width: '50%' },
    },
  })
  try {
    const element = target.querySelector<HTMLDivElement>('[data-mol-id="file-field"]')
    expect(element?.style.marginTop).toBe('8px')
    expect(element?.style.width).toBe('50%')
  } finally {
    await unmount(instance)
  }
})
