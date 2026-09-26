# @molecule/api-ai-summarization-llm

## 1.1.1

### Patch Changes

- 8edbd22: Summaries are plain text (markdown the model adds is removed) and the model is asked for a length under the cap, so answers stop landing exactly on it.

## 1.1.0

### Minor Changes

- 1413248: Hard word/sentence caps enforced in code (whole sentences only, re-asks when long), plus a file cache keyed by a hash of the text.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai@1.0.1
  - @molecule/api-ai-summarization@1.0.1
  - @molecule/api-i18n@1.0.1
