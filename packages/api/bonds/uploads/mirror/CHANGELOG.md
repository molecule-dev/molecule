# @molecule/api-uploads-mirror

## 1.1.2

### Patch Changes

- 1d9a225: A copy stream that the mirror destroys because the source failed, hit its size limit or closed early no longer raises an uncaught `error` event when a target does not listen for one; each target still receives the failure through its own error callback.

## 1.1.1

### Patch Changes

- 40fb13e: A multipart size limit or a source that closes before it ends fails every copy instead of storing a truncated body; `uploadPromise` is marked handled for callers that rely on `onError`; uploads are tracked by their returned file as well as their id.

## 1.1.0

### Minor Changes

- 1f7356d: New bond: one upload provider that writes every file to several upload providers and reads it back from whichever has it.
