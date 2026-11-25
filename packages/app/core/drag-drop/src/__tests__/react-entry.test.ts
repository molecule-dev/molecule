import { expect, it, vi } from 'vitest'

vi.mock('react', () => {
  throw new Error('The core drag-drop entry must load without React')
})

it('loads the drag-drop contract without importing React', async () => {
  const core = await import('../index.js')

  expect(core.createSortable).toBeTypeOf('function')
})
