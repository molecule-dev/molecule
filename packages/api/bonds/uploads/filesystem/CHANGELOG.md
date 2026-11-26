# @molecule/api-uploads-filesystem

## 1.2.2

### Patch Changes

- Types optional filesystem upload readiness registration against the lifecycle package.

## 1.2.1

### Patch Changes

- Publishes the changes listed under the previous version, which was not released to npm.

## 1.2.0

### Minor Changes

- Refuses a blocked file type, also when declared with a charset, with `UploadRefusedError` (415 through `receiveUploads()`) unless the route passes `allowActiveTypes`; requires `@molecule/api-uploads` 1.3.
- `getFile` resolves `null` for an id that resolves outside the upload folder, as for a missing file, and logs the refused id.

### Patch Changes

- Only an id `upload()` minted names a file: `getFile` answers `null` for any other id, a symlink or a directory, and `getFileStream` throws for them instead of handing out a stream that errors later.
- An upload aborted before its file was opened, such as a file refused at its first chunk, no longer leaves an empty file on disk.
- The upload folder it creates holds a `.gitignore` of `*`, so git never tracks uploaded files.
- Names files with `randomUUID()` from `node:crypto` and no longer depends on `uuid`.

## 1.1.3

### Patch Changes

- `FileInfo.filename` may be `undefined`, as multipart parsers such as busboy report it, so their file info is passed to `upload()` as it is; the providers store such a file with an empty name.
- An absolute `FILE_UPLOAD_PATH` is now used as given instead of being placed under the working directory.

## 1.1.2

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.1.0

### Minor Changes

- 7b65737: Adds a ping(), and registers a non-critical storage readiness probe that checks the upload directory is writable when @molecule/api-process-lifecycle is present.

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
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-uploads@1.0.1
