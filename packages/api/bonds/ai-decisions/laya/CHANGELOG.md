# @molecule/api-ai-decisions-laya

## 1.1.0

### Minor Changes

- Adds an optional `headers` config hook, resolved before each request, for hosts whose auth expires or is not a bearer token.

## 1.0.1

### Patch Changes

- Throws a clear error when `decide()` is given `images`, which Laya does not read, instead of answering from the text alone.
- Updated dependencies
  - @molecule/api-ai-decisions@1.1.0
