/**
 * Helpers for React's render model, exported as `@molecule/app-react/render`.
 *
 * A React component body re-runs on every render, and React may throw a render
 * away before it commits. These hooks keep what such a render saw out of
 * committed effects and handlers. They belong to React alone: the root of
 * `@molecule/app-react` is what every framework binding also exports, and no
 * other binding has these, since a Vue, Solid, Svelte or Angular setup runs
 * once. Modules here import only from `react` and from this directory.
 *
 * @example
 * ```tsx
 * import { useEffectEvent, useStableCallback } from '@molecule/app-react/render'
 *
 * const onTick = useEffectEvent(() => report(count)) // reads the latest `count` from an effect
 * const onSelect = useStableCallback((id: string) => props.onSelect?.(id)) // one identity, latest props
 * ```
 *
 * @module
 */

export * from './useEffectEvent.js'
export * from './useStableCallback.js'
export * from './useValueAtKeyChange.js'
