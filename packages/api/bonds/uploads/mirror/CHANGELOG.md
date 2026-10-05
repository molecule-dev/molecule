# @molecule/api-uploads-mirror

## 1.1.1

### Patch Changes

- 40fb13e: A multipart size limit or a source that closes before it ends fails every copy instead of storing a truncated body; `uploadPromise` is marked handled for callers that rely on `onError`; uploads are tracked by their returned file as well as their id.

## 1.1.0

### Minor Changes

- 1f7356d: New bond: one upload provider that writes every file to several upload providers and reads it back from whichever has it.
