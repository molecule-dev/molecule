import { expect, it, vi } from 'vitest'

import { createAsyncStorageProvider } from '../provider.js'

const getItem = vi.hoisted(() => vi.fn(async (_key: string) => '"saved"'))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    default: {
      getItem,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      multiGet: vi.fn(),
      multiSet: vi.fn(),
      multiRemove: vi.fn(),
      clear: vi.fn(),
    },
  },
}))

it('reads through a nested CommonJS default export', async () => {
  await expect(createAsyncStorageProvider().get('preference')).resolves.toBe('saved')
  expect(getItem).toHaveBeenCalledWith('preference')
})
