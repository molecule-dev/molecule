/**
 * `@molecule/app-keyboard-shortcuts-react` cases: the `useKeyboardShortcut`
 * hook and the `expandKeys` key normalizer. The package has no components —
 * its whole surface is one lifecycle hook plus one pure function.
 *
 * Every hook case mounts WITHOUT a keyboard-shortcuts provider bonded (the kit
 * bonds none and seeds none), so the cases pin the documented no-provider
 * contract every framework must share: the hook is a no-op rather than an
 * error, a disabled or blank shortcut registers nothing, a remount starts
 * fresh, and unmounting leaves no calls behind. Registration WITH a provider
 * (register/unregister call order, the latest-handler guarantee) is each
 * package's own unit suite, which runs the hook against a fake provider.
 *
 * @module
 */

import type { HookCases } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** `useKeyboardShortcut(keys, handler, options)`: the no-provider contract. */
const useKeyboardShortcutCases: HookCases = {
  hook: 'useKeyboardShortcut',
  cases: [
    {
      name: 'a shortcut without a bonded provider registers nothing',
      args: ['mod+k', { $fn: 'onOpen' }, { description: 'Open palette', scope: 'palette' }],
    },
    {
      name: 'a disabled shortcut registers nothing',
      args: ['/', { $fn: 'onFocus' }, { enabled: false, description: 'Focus search' }],
    },
    {
      name: 'a blank keys list registers nothing',
      args: [[], { $fn: 'onSave' }],
    },
    {
      name: 'a remount registers the fresh shortcut call, still nothing',
      args: ['mod+k', { $fn: 'onOpen' }],
      steps: [{ type: 'remount', args: [['mod+s'], { $fn: 'onSave' }] }],
    },
    {
      name: 'unmounting without a provider leaves nothing behind',
      args: ['mod+k', { $fn: 'onOpen' }],
      steps: [{ type: 'unmount' }],
    },
  ],
}

/** `@molecule/app-keyboard-shortcuts-react`. */
export const keyboardShortcutsFeature: FeatureCases = {
  package: '@molecule/app-keyboard-shortcuts-react',
  families: [],
  hooks: [useKeyboardShortcutCases],
  values: [
    {
      export: 'expandKeys',
      calls: [
        ['Mod+K'],
        [['/', ' ', 'shift+?']],
        ['mod+k'],
        ['SHIFT+TAB'],
        ['  '],
        [['mod+a', 'ctrl+s']],
        [[]],
        ['ctrl+alt+p'],
      ],
    },
  ],
}
