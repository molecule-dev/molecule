/**
 * React Native framework bindings for molecule.dev.
 *
 * Re-exports all hooks from `@molecule/app-react` (which are pure React,
 * no DOM dependency) and adds RN-specific hooks.
 *
 * @module
 */

// Re-export everything from @molecule/app-react — all hooks are RN-compatible
export * from '@molecule/app-react'

// RN-specific hooks
export { useAppState } from './hooks/useAppState.js'
export { useBackHandler } from './hooks/useBackHandler.js'
export { useKeyboardHeight } from './hooks/useKeyboardHeight.js'
export { useSafeArea } from './hooks/useSafeArea.js'

// RN-specific types
export type { UseAppStateResult, UseBackHandlerOptions, UseKeyboardHeightResult } from './types.js'
