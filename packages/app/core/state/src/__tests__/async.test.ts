import { describe, expect, it } from 'vitest'

import { createAsyncState } from '../async.js'

describe('Async State', () => {
  describe('createAsyncState', () => {
    it('should create initial async state with default values', () => {
      const [state] = createAsyncState<string | null>(null)

      expect(state.data).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should create initial async state with provided initial data', () => {
      const [state] = createAsyncState({ count: 0 })

      expect(state.data).toEqual({ count: 0 })
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('actions', () => {
    describe('setData', () => {
      it('should update the data value', () => {
        const [state, actions] = createAsyncState<string>('')

        actions.setData('new value')

        expect(state.data).toBe('new value')
      })

      it('should update complex data', () => {
        interface User {
          id: number
          name: string
        }
        const [state, actions] = createAsyncState<User | null>(null)

        actions.setData({ id: 1, name: 'John' })

        expect(state.data).toEqual({ id: 1, name: 'John' })
      })
    })

    describe('setLoading', () => {
      it('should set loading to true', () => {
        const [state, actions] = createAsyncState(null)

        actions.setLoading(true)

        expect(state.loading).toBe(true)
      })

      it('should set loading to false', () => {
        const [state, actions] = createAsyncState(null)

        actions.setLoading(true)
        actions.setLoading(false)

        expect(state.loading).toBe(false)
      })
    })

    describe('setError', () => {
      it('should set an error', () => {
        const [state, actions] = createAsyncState(null)
        const error = new Error('Test error')

        actions.setError(error)

        expect(state.error).toBe(error)
        expect(state.error?.message).toBe('Test error')
      })

      it('should clear error when set to null', () => {
        const [state, actions] = createAsyncState(null)

        actions.setError(new Error('Test error'))
        actions.setError(null)

        expect(state.error).toBeNull()
      })
    })

    describe('reset', () => {
      it('should reset to initial state', () => {
        const initialData = { value: 'initial' }
        const [state, actions] = createAsyncState(initialData)

        actions.setData({ value: 'modified' })
        actions.setLoading(true)
        actions.setError(new Error('test'))

        actions.reset()

        expect(state.data).toEqual(initialData)
        expect(state.loading).toBe(false)
        expect(state.error).toBeNull()
      })

      it('should reset to null initial data', () => {
        const [state, actions] = createAsyncState<string | null>(null)

        actions.setData('some value')
        actions.reset()

        expect(state.data).toBeNull()
      })
    })

    describe('execute', () => {
      it('should set loading to true during execution', async () => {
        const [state, actions] = createAsyncState(null)

        let loadingDuringExecution = false
        const promise = actions.execute(async () => {
          loadingDuringExecution = state.loading
          return 'result'
        })

        expect(state.loading).toBe(true)
        expect(state.error).toBeNull()

        await promise

        expect(loadingDuringExecution).toBe(true)
        expect(state.loading).toBe(false)
      })

      it('should return the result of the async function', async () => {
        const [, actions] = createAsyncState(null)

        const result = await actions.execute(async () => {
          return { id: 1, name: 'Test' }
        })

        expect(result).toEqual({ id: 1, name: 'Test' })
      })

      it('should set error on failure', async () => {
        const [state, actions] = createAsyncState(null)
        const testError = new Error('Async operation failed')

        await expect(
          actions.execute(async () => {
            throw testError
          }),
        ).rejects.toThrow('Async operation failed')

        expect(state.error).toBe(testError)
        expect(state.loading).toBe(false)
      })

      it('should convert non-Error throws to Error', async () => {
        const [state, actions] = createAsyncState(null)

        await expect(
          actions.execute(async () => {
            throw 'string error'
          }),
        ).rejects.toThrow()

        expect(state.error).toBeInstanceOf(Error)
        expect(state.error?.message).toBe('string error')
      })

      it('should clear previous error on new execution', async () => {
        const [state, actions] = createAsyncState(null)

        // First, create an error
        await expect(
          actions.execute(async () => {
            throw new Error('First error')
          }),
        ).rejects.toThrow()

        expect(state.error).toBeDefined()

        // Then execute successfully
        await actions.execute(async () => 'success')

        expect(state.error).toBeNull()
      })

      it('should handle async delays', async () => {
        const [state, actions] = createAsyncState(null)

        const promise = actions.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return 'delayed result'
        })

        expect(state.loading).toBe(true)

        const result = await promise

        expect(result).toBe('delayed result')
        expect(state.loading).toBe(false)
      })
    })
  })
})
