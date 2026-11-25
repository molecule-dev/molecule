# @molecule/api-uploads

## 1.3.0

### Minor Changes

- Add `receiveUploads`, `getUploads` and `discardUploads` for upload routes.
- `receiveUploads` removes a route's stored files when it answers 400 or more, every XML and script type is refused unless the route allows them (`isBlockedUploadType`), and `sendUpload` sends at most 200 characters of a file's name.
- Add `sendUpload`, which serves a stored file as a download the browser does not open, and `allowActiveTypes` for a `receiveUploads` route that stores the types a browser runs, which every provider otherwise refuses with `UploadRefusedError` (415).

## 1.2.0

### Minor Changes

- `FileInfo.filename` may be `undefined`, as multipart parsers such as busboy report it, so their file info is passed to `upload()` as it is; the providers store such a file with an empty name.

### Patch Changes

- The usage example is now a complete Express route: it parses the upload with busboy, waits for the write to finish, and removes a file that was rejected or over the size cap.

## 1.1.0

### Minor Changes

- 7b65737: Adds optional ping() and close() so a storage bond can report readiness and release its client at shutdown.

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
