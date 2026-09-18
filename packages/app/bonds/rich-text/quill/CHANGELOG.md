# @molecule/app-rich-text-quill

## 1.0.3

### Patch Changes

- ff97bf4: `textToValue()` now HTML-escapes the source text when building its `.html` output, so markup in the input (e.g. `<script>`/`<img onerror>`) arrives inert in the stored HTML instead of becoming a stored-XSS payload. The plain `text` field (and Quill `delta`) is unchanged.

## 1.0.2

### Patch Changes

- 4f9197d: Update dompurify to 3.4.13 (fixes GHSA-55q2-fjhq-7xh7 and related sanitizer advisories).
- Updated dependencies [4f9197d]
  - @molecule/app-rich-text@1.0.2

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-rich-text@1.0.1
