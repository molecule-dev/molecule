# @molecule/app-fonts-lora

## 1.0.5

### Patch Changes

- ebf1f02: Resolve self-hosted font files through browser builds and require a font core that supports asset URLs.

## 1.0.4

### Patch Changes

- 2584a32: The README now documents bonding the font without `mlcl`: import the packaged webfont from `./fonts/*` as a bundler asset URL and pass it as the face, or copy `fonts/` into the app's `public/fonts/`.

## 1.0.3

### Patch Changes

- Documentation: the README now ships runnable example code (and the server-only browser guard/formatting was regenerated).

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-fonts@1.0.1
