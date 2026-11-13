# @molecule/app-locales-react

## 1.1.1

### Patch Changes

- Every error the framework bindings raise is translated in all supported languages; a key no binding uses any more is removed.

## 1.1.0

### Minor Changes

- `useStorageValue` ends loading when a write lands before the first read, starts over on a new key, and reads once for an inline object `defaultValue`. `useWorkspace` reads the full state from providers with `getState()`. `usePush`, `useVerifyPaymentReturn` and `useChat` log the failures they used to drop, and `useOAuth` translates its generic failure message (`react.error.oauthFailed`).

## 1.0.3

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
