---
'@molecule/eslint-config': minor
---

Add `no-vite-import-meta`, enabled outside test files in a workspace that depends on `react-native`: it reports `import.meta.env`, `import.meta.glob` and `import.meta.hot`, which are undefined in an app Metro bundles.
