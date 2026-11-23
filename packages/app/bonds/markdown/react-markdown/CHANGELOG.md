# @molecule/app-markdown-react-markdown

## 2.0.0

### Major Changes

- `sanitize: false` now renders raw HTML in the source as elements (pass it only for trusted content) and still drops `javascript:` and `vbscript:` links; the provider also renders the shared markdown DOM: unique ids and a `toc` for every rendered heading, refused links and images as their text, `tel:` links, footnotes and task lists without class names, and `elementAttributes`, and a `components` entry that is not a component throws.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-markdown@1.0.1
