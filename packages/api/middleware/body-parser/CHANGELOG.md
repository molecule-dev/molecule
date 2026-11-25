# @molecule/api-middleware-body-parser

## 1.2.0

### Minor Changes

- Publishes the changes listed under the previous version, which was not released to npm.

## 1.1.0

### Minor Changes

- Add `createUploadParser`, the route-level contract for receiving multipart file uploads.
- A storage can refuse a file with an `onError` error carrying a 4xx `status` and an `errorKey` (`StorageRefusal`); the upload parser answers it as JSON with that status.

### Patch Changes

- The upload parser contract states that a request's files are removed when the route answers 400 or more.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
